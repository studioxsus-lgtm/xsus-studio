
/**
 * XSUS AI V3 — Private Write Coordinator
 * Version: 1.0.0
 * Phase: 22.16.5.8.4
 *
 * Coordinates private write operations.
 *
 * Guarantees within one coordinator instance:
 * - One in-flight operation per key.
 * - Repeated callers share the same promise.
 * - Completed keys are retained in memory.
 * - Reusing a key with a different payload is rejected.
 * - Failed operations can be retried.
 * - Account changes invalidate local state.
 *
 * Does NOT guarantee database idempotency.
 * PostgreSQL uniqueness is required for that.
 */

export const PRIVATE_WRITE_COORDINATOR_VERSION =
  "1.0.0";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUUID(value, field) {
  if (
    typeof value !== "string" ||
    !UUID_PATTERN.test(value)
  ) {
    throw new TypeError(
      `Invalid ${field}.`
    );
  }

  return value.toLowerCase();
}

export function createWriteOperationId() {
  if (
    typeof globalThis.crypto?.randomUUID !==
    "function"
  ) {
    throw new Error(
      "Secure UUID generation is unavailable."
    );
  }

  return globalThis.crypto.randomUUID();
}

export function createPrivateWriteCoordinator({
  getUserId,
  write,
  maxCompleted = 500
} = {}) {
  if (typeof getUserId !== "function") {
    throw new TypeError(
      "getUserId must be a function."
    );
  }

  if (typeof write !== "function") {
    throw new TypeError(
      "write must be a function."
    );
  }

  if (
    !Number.isSafeInteger(maxCompleted) ||
    maxCompleted < 1 ||
    maxCompleted > 10000
  ) {
    throw new RangeError(
      "Invalid completed-operation limit."
    );
  }

  const pending = new Map();
  const completed = new Map();

  let activeUserId = null;
  let generation = 0;
  let cancellationEpoch = 0;
  let destroyed = false;

  function assertActive() {
    if (destroyed) {
      throw new Error(
        "Write coordinator is destroyed."
      );
    }
  }

  function syncIdentity(userId) {
    if (activeUserId !== userId) {
      activeUserId = userId;
      generation += 1;
      pending.clear();
      completed.clear();
    }
  }

  function remember(key, content, result) {
    completed.set(key, { content, result });

    while (completed.size > maxCompleted) {
      const oldest =
        completed.keys().next().value;

      completed.delete(oldest);
    }
  }

  async function execute({
    operationId,
    conversationId,
    content
  } = {}) {
    assertActive();

    const id = requireUUID(
      operationId,
      "operation ID"
    );

    const conversation = requireUUID(
      conversationId,
      "conversation ID"
    );

    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 12000
    ) {
      throw new TypeError(
        "Invalid message content."
      );
    }

    // Track explicit invalidation across asynchronous identity resolution.
    // Keep this separate from generation: initial identity synchronization
    // must not reject concurrent callers belonging to the same user.
    const identityEpoch = cancellationEpoch;
    const userId = await getUserId();

    assertActive();
    if (identityEpoch !== cancellationEpoch) {
      throw new Error("Write operation invalidated.");
    }

    if (!userId) {
      syncIdentity(null);

      throw new Error(
        "Authentication required."
      );
    }

    const owner = requireUUID(
      userId,
      "user ID"
    );

    syncIdentity(owner);

    const key = [
      owner,
      conversation,
      id
    ].join(":");

    const previous = completed.get(key);
    if (previous) {
      if (previous.content !== content) {
        throw new Error(
          "Operation ID reused with different content."
        );
      }
      return previous.result;
    }

    const inFlight = pending.get(key);
    if (inFlight) {
      if (inFlight.content !== content) {
        throw new Error(
          "Operation ID reused with different content."
        );
      }
      return inFlight.promise;
    }

    const token = generation;

    const operation = (async () => {
      const result = await write({
        operationId: id,
        conversationId: conversation,
        content,
        userId: owner
      });

      if (
        destroyed ||
        token !== generation
      ) {
        throw new Error(
          "Write operation invalidated."
        );
      }

      const latestUserId =
        await getUserId();

      if (
        destroyed ||
        token !== generation ||
        !latestUserId ||
        latestUserId.toLowerCase() !== owner
      ) {
        throw new Error(
          "Authentication changed during write."
        );
      }

      remember(key, content, result);

      return result;
    })();

    const entry = { content, promise: operation };
    pending.set(key, entry);

    try {
      return await operation;
    } finally {
      if (pending.get(key) === entry) {
        pending.delete(key);
      }
    }
  }

  function invalidate() {
    assertActive();

    cancellationEpoch += 1;
    generation += 1;
    pending.clear();
    completed.clear();
    activeUserId = null;

    return true;
  }

  function destroy() {
    if (destroyed) {
      return;
    }

    destroyed = true;
    cancellationEpoch += 1;
    generation += 1;

    pending.clear();
    completed.clear();

    activeUserId = null;
  }

  return Object.freeze({
    execute,
    invalidate,
    destroy,

    getPendingCount() {
      return pending.size;
    },

    getCompletedCount() {
      return completed.size;
    },

    isDestroyed() {
      return destroyed;
    }
  });
}
