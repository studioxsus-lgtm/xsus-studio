
/**
 * XSUS AI V3 — Private Write Coordinator Tests
 * Phase: 22.16.5.8.3
 *
 * Tests:
 * - Public API
 * - Validation
 * - Concurrent writes
 * - Idempotency
 * - Authentication
 * - Lifecycle
 * - Recovery
 *
 * No real database writes.
 */

import {
  describe,
  test,
  expect,
  vi
} from "vitest";

import {
  PRIVATE_WRITE_COORDINATOR_VERSION,
  createWriteOperationId,
  createPrivateWriteCoordinator
} from "../../assets/js/xsus-ai/adapters/xsus-private-write-coordinator.js";

const USER_A =
  "11111111-1111-4111-8111-111111111111";

const USER_B =
  "22222222-2222-4222-8222-222222222222";

const CONVERSATION_ID =
  "33333333-3333-4333-8333-333333333333";

const OPERATION_ID =
  "44444444-4444-4444-8444-444444444444";

const SECOND_OPERATION_ID =
  "55555555-5555-4555-8555-555555555555";

function deferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject
  };
}

function createHarness(options = {}) {
  let userId = USER_A;

  const getUserId = vi.fn(
    async () => userId
  );

  const write = vi.fn(
    async ({ operationId, content }) => ({
      id: operationId,
      content
    })
  );

  const coordinator =
    createPrivateWriteCoordinator({
      getUserId,
      write,
      ...options
    });

  return {
    coordinator,
    getUserId,
    write,

    setUser(nextUserId) {
      userId = nextUserId;
    }
  };
}

function request(overrides = {}) {
  return {
    operationId: OPERATION_ID,
    conversationId: CONVERSATION_ID,
    content: "Hello XSUS",
    ...overrides
  };
}

/* ============================================
   PUBLIC CONTRACT
============================================ */

describe("Public Contract", () => {
  test("01. exposes version 1.0.0", () => {
    expect(
      PRIVATE_WRITE_COORDINATOR_VERSION
    ).toBe("1.0.0");
  });

  test("02. creates valid operation UUID", () => {
    const id = createWriteOperationId();

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test("03. requires callback functions", () => {
    expect(() =>
      createPrivateWriteCoordinator()
    ).toThrow(TypeError);

    expect(() =>
      createPrivateWriteCoordinator({
        getUserId: async () => USER_A
      })
    ).toThrow(TypeError);
  });

  test("04. validates completed limit", () => {
    expect(() =>
      createPrivateWriteCoordinator({
        getUserId: async () => USER_A,
        write: async () => true,
        maxCompleted: 0
      })
    ).toThrow(RangeError);
  });
});

/* ============================================
   INPUT VALIDATION
============================================ */

describe("Input Validation", () => {
  test("05. rejects invalid operation ID", async () => {
    const { coordinator, write } =
      createHarness();

    await expect(
      coordinator.execute(
        request({
          operationId: "invalid"
        })
      )
    ).rejects.toThrow(TypeError);

    expect(write).not.toHaveBeenCalled();
  });

  test("06. rejects invalid conversation ID", async () => {
    const { coordinator, write } =
      createHarness();

    await expect(
      coordinator.execute(
        request({
          conversationId: "invalid"
        })
      )
    ).rejects.toThrow(TypeError);

    expect(write).not.toHaveBeenCalled();
  });

  test("07. rejects empty content", async () => {
    const { coordinator, write } =
      createHarness();

    await expect(
      coordinator.execute(
        request({
          content: "   "
        })
      )
    ).rejects.toThrow(TypeError);

    expect(write).not.toHaveBeenCalled();
  });

  test("08. rejects oversized content", async () => {
    const { coordinator, write } =
      createHarness();

    await expect(
      coordinator.execute(
        request({
          content: "X".repeat(12001)
        })
      )
    ).rejects.toThrow(TypeError);

    expect(write).not.toHaveBeenCalled();
  });
});

/* ============================================
   BASIC WRITES
============================================ */

describe("Basic Writes", () => {
  test("09. executes a valid write", async () => {
    const { coordinator, write } =
      createHarness();

    const result =
      await coordinator.execute(
        request()
      );

    expect(result).toEqual({
      id: OPERATION_ID,
      content: "Hello XSUS"
    });

    expect(write).toHaveBeenCalledTimes(1);
    expect(
      coordinator.getCompletedCount()
    ).toBe(1);
  });

  test("10. reuses completed operation result", async () => {
    const { coordinator, write } =
      createHarness();

    const first =
      await coordinator.execute(request());

    const second =
      await coordinator.execute(request());

    expect(second).toEqual(first);
    expect(write).toHaveBeenCalledTimes(1);
  });
});

/* ============================================
   CONCURRENCY
============================================ */

describe("Concurrent Operations", () => {
  test("11. deduplicates concurrent identical requests", async () => {
    const gate = deferred();

    const write = vi.fn(
      async () => gate.promise
    );

    const coordinator =
      createPrivateWriteCoordinator({
        getUserId: async () => USER_A,
        write
      });

    const first =
      coordinator.execute(request());

    const second =
      coordinator.execute(request());

    await vi.waitFor(() => {
      expect(write).toHaveBeenCalledTimes(1);
    });

    gate.resolve({
      id: OPERATION_ID
    });

    const results =
      await Promise.all([first, second]);

    expect(results[0]).toEqual(results[1]);
    expect(write).toHaveBeenCalledTimes(1);
  });

  test("12. permits different operation IDs", async () => {
    const { coordinator, write } =
      createHarness();

    await Promise.all([
      coordinator.execute(request()),
      coordinator.execute(
        request({
          operationId: SECOND_OPERATION_ID
        })
      )
    ]);

    expect(write).toHaveBeenCalledTimes(2);
  });

  test("13. rejects reused ID with different content", async () => {
    const { coordinator, write } =
      createHarness();

    await coordinator.execute(request());

    await expect(
      coordinator.execute(
        request({
          content: "Different content"
        })
      )
    ).rejects.toThrow();

    expect(write).toHaveBeenCalledTimes(1);
  });
});

/* ============================================
   AUTHENTICATION
============================================ */

describe("Authentication Isolation", () => {
  test("14. rejects signed-out writes", async () => {
    const {
      coordinator,
      write,
      setUser
    } = createHarness();

    setUser(null);

    await expect(
      coordinator.execute(request())
    ).rejects.toThrow(
      "Authentication required."
    );

    expect(write).not.toHaveBeenCalled();
  });

  test("15. invalidates previous account cache", async () => {
    const {
      coordinator,
      write,
      setUser
    } = createHarness();

    await coordinator.execute(request());

    setUser(USER_B);

    await coordinator.execute(request());

    expect(write).toHaveBeenCalledTimes(2);
  });

  test("16. rejects identity change during write", async () => {
    const gate = deferred();

    let userId = USER_A;

    const coordinator =
      createPrivateWriteCoordinator({
        getUserId: async () => userId,
        write: async () => gate.promise
      });

    const pending =
      coordinator.execute(request());

    await vi.waitFor(() => {
      expect(
        coordinator.getPendingCount()
      ).toBe(1);
    });

    userId = USER_B;

    gate.resolve({
      id: OPERATION_ID
    });

    await expect(pending).rejects.toThrow(
      "Authentication changed during write."
    );
  });
});

/* ============================================
   RECOVERY
============================================ */

describe("Recovery and Lifecycle", () => {
  test("17. retries failed operations", async () => {
    const write = vi.fn()
      .mockRejectedValueOnce(
        new Error("Network failure")
      )
      .mockResolvedValueOnce({
        id: OPERATION_ID
      });

    const coordinator =
      createPrivateWriteCoordinator({
        getUserId: async () => USER_A,
        write
      });

    await expect(
      coordinator.execute(request())
    ).rejects.toThrow(
      "Network failure"
    );

    const result =
      await coordinator.execute(request());

    expect(result.id).toBe(OPERATION_ID);
    expect(write).toHaveBeenCalledTimes(2);
  });

  test("18. invalidate clears completed cache", async () => {
    const { coordinator } =
      createHarness();

    await coordinator.execute(request());

    expect(
      coordinator.getCompletedCount()
    ).toBe(1);

    coordinator.invalidate();

    expect(
      coordinator.getCompletedCount()
    ).toBe(0);
  });

  test("19. destroy prevents future writes", async () => {
    const {
      coordinator,
      write
    } = createHarness();

    coordinator.destroy();

    expect(
      coordinator.isDestroyed()
    ).toBe(true);

    await expect(
      coordinator.execute(request())
    ).rejects.toThrow(
      "Write coordinator is destroyed."
    );

    expect(write).not.toHaveBeenCalled();
  });

  test("20. destroy invalidates pending results", async () => {
    const gate = deferred();

    const write = vi.fn(
      async () => gate.promise
    );

    const coordinator =
      createPrivateWriteCoordinator({
        getUserId: async () => USER_A,
        write
      });

    const pending =
      coordinator.execute(request());

    await vi.waitFor(() => {
      expect(write).toHaveBeenCalledTimes(1);
    });

    coordinator.destroy();

    gate.resolve({
      id: OPERATION_ID
    });

    await expect(pending).rejects.toThrow(
      "Write operation invalidated."
    );
  });
});

/* ============================================
   PHASE 22.16.5.8.6 — CONCURRENCY HARDENING
============================================ */

describe("Concurrent Idempotency Regression", () => {
  test("21. rejects conflicting content while an operation is pending", async () => {
    const gate = deferred();
    const write = vi.fn(async () => gate.promise);
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write
    });

    const first = coordinator.execute(request());

    await vi.waitFor(() => {
      expect(coordinator.getPendingCount()).toBe(1);
    });

    await expect(
      coordinator.execute(request({ content: "Conflicting payload" }))
    ).rejects.toThrow("Operation ID reused with different content.");

    expect(write).toHaveBeenCalledTimes(1);
    gate.resolve({ id: OPERATION_ID });
    await expect(first).resolves.toEqual({ id: OPERATION_ID });
    expect(coordinator.getPendingCount()).toBe(0);
  });

  test("22. invalidation prevents stale pending results from entering the cache", async () => {
    const gate = deferred();
    const write = vi.fn(async () => gate.promise);
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write
    });

    const first = coordinator.execute(request());
    await vi.waitFor(() => {
      expect(coordinator.getPendingCount()).toBe(1);
    });

    coordinator.invalidate();
    expect(coordinator.getPendingCount()).toBe(0);
    expect(coordinator.getCompletedCount()).toBe(0);

    gate.resolve({ id: OPERATION_ID });
    await expect(first).rejects.toThrow("Write operation invalidated.");
    expect(coordinator.getCompletedCount()).toBe(0);
  });

  test("23. failed operations can retry with a different payload", async () => {
    const write = vi.fn()
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce({ id: OPERATION_ID, content: "Retry payload" });
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write
    });

    await expect(coordinator.execute(request())).rejects.toThrow(
      "Temporary failure"
    );

    await expect(
      coordinator.execute(request({ content: "Retry payload" }))
    ).resolves.toEqual({ id: OPERATION_ID, content: "Retry payload" });

    expect(write).toHaveBeenCalledTimes(2);
    expect(coordinator.getCompletedCount()).toBe(1);
  });

  test("24. same operation ID in different conversations has a distinct key", async () => {
    const { coordinator, write } = createHarness();
    const otherConversation = "66666666-6666-4666-8666-666666666666";

    await coordinator.execute(request());
    await coordinator.execute(request({
      conversationId: otherConversation,
      content: "Other conversation"
    }));

    expect(write).toHaveBeenCalledTimes(2);
    expect(coordinator.getCompletedCount()).toBe(2);
  });

  test("25. invalidating a pending write allows a new generation to finish", async () => {
    const oldGate = deferred();
    const write = vi.fn()
      .mockImplementationOnce(async () => oldGate.promise)
      .mockResolvedValueOnce({ id: OPERATION_ID, content: "Fresh payload" });
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write
    });

    const oldOperation = coordinator.execute(request());
    await vi.waitFor(() => {
      expect(coordinator.getPendingCount()).toBe(1);
    });

    coordinator.invalidate();

    const fresh = await coordinator.execute(
      request({ content: "Fresh payload" })
    );
    expect(fresh.content).toBe("Fresh payload");

    oldGate.resolve({ id: OPERATION_ID, content: "Stale payload" });
    await expect(oldOperation).rejects.toThrow(
      "Write operation invalidated."
    );

    expect(write).toHaveBeenCalledTimes(2);
    expect(coordinator.getCompletedCount()).toBe(1);
    await expect(
      coordinator.execute(request({ content: "Fresh payload" }))
    ).resolves.toEqual(fresh);
    expect(write).toHaveBeenCalledTimes(2);
  });
});

/* ============================================
   PHASE 22.16.5.8.7 — ADVANCED INTEGRITY
============================================ */

describe("Advanced Concurrency and Recovery Integrity", () => {
  test("26. rejects conflicting pending callers without disrupting identical callers", async () => {
    const gate = deferred();
    const write = vi.fn(async () => gate.promise);
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write
    });

    const first = coordinator.execute(request());
    await vi.waitFor(() => {
      expect(coordinator.getPendingCount()).toBe(1);
    });

    const identical = coordinator.execute(request());
    const conflicting = coordinator.execute(
      request({ content: "Conflicting request" })
    );

    await expect(conflicting).rejects.toThrow(
      "Operation ID reused with different content."
    );

    gate.resolve({ id: OPERATION_ID });
    const results = await Promise.all([first, identical]);
    expect(results[0]).toEqual(results[1]);
    expect(write).toHaveBeenCalledTimes(1);
    expect(coordinator.getCompletedCount()).toBe(1);
  });

  test("27. rejects a write after the user signs out mid-operation", async () => {
    const gate = deferred();
    let currentUser = USER_A;
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => currentUser,
      write: async () => gate.promise
    });

    const pending = coordinator.execute(request());
    await vi.waitFor(() => {
      expect(coordinator.getPendingCount()).toBe(1);
    });

    currentUser = null;
    gate.resolve({ id: OPERATION_ID });

    await expect(pending).rejects.toThrow(
      "Authentication changed during write."
    );
    expect(coordinator.getCompletedCount()).toBe(0);
  });

  test("28. completed cache respects the configured capacity", async () => {
    const { coordinator, write } = createHarness({
      maxCompleted: 2
    });

    const first = request();
    const second = request({ operationId: SECOND_OPERATION_ID });
    const third = request({
      operationId: "77777777-7777-4777-8777-777777777777"
    });

    await coordinator.execute(first);
    await coordinator.execute(second);
    await coordinator.execute(third);

    expect(coordinator.getCompletedCount()).toBe(2);

    await coordinator.execute(first);
    expect(write).toHaveBeenCalledTimes(4);
    expect(coordinator.getCompletedCount()).toBe(2);
  });

  test("29. destruction is idempotent and clears both caches", async () => {
    const { coordinator } = createHarness();
    await coordinator.execute(request());
    expect(coordinator.getCompletedCount()).toBe(1);

    coordinator.destroy();
    coordinator.destroy();

    expect(coordinator.isDestroyed()).toBe(true);
    expect(coordinator.getPendingCount()).toBe(0);
    expect(coordinator.getCompletedCount()).toBe(0);
    expect(() => coordinator.invalidate()).toThrow(
      "Write coordinator is destroyed."
    );
  });

  test("30. a failed concurrent write is retried only after the pending entry clears", async () => {
    const gate = deferred();
    const write = vi.fn()
      .mockImplementationOnce(async () => gate.promise)
      .mockResolvedValueOnce({ id: OPERATION_ID, content: "Recovered" });
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write
    });

    const first = coordinator.execute(request());
    await vi.waitFor(() => {
      expect(coordinator.getPendingCount()).toBe(1);
    });

    const second = coordinator.execute(request());
    gate.reject(new Error("Transient write failure"));

    const settled = await Promise.allSettled([first, second]);
    expect(settled.map((item) => item.status)).toEqual([
      "rejected",
      "rejected"
    ]);
    expect(write).toHaveBeenCalledTimes(1);
    expect(coordinator.getPendingCount()).toBe(0);

    const recovered = await coordinator.execute(
      request({ content: "Recovered" })
    );
    expect(recovered.content).toBe("Recovered");
    expect(write).toHaveBeenCalledTimes(2);
    expect(coordinator.getCompletedCount()).toBe(1);
  });
});

/* ============================================
   PHASE 22.16.5.8.8 — STRESS AND LIFECYCLE
============================================ */

describe("Stress Testing and Lifecycle Integrity", () => {
  test("31. deduplicates a burst of 100 identical concurrent requests", async () => {
    const gate = deferred();
    const write = vi.fn(async () => gate.promise);
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write
    });

    const requests = Array.from({ length: 100 }, () =>
      coordinator.execute(request())
    );

    await vi.waitFor(() => {
      expect(write).toHaveBeenCalledTimes(1);
    });
    expect(coordinator.getPendingCount()).toBe(1);

    gate.resolve({ id: OPERATION_ID, content: "Hello XSUS" });
    const results = await Promise.all(requests);

    expect(results).toHaveLength(100);
    expect(results.every((result) => result === results[0])).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(coordinator.getPendingCount()).toBe(0);
    expect(coordinator.getCompletedCount()).toBe(1);
  });

  test("32. executes 50 distinct concurrent operation IDs independently", async () => {
    const write = vi.fn(async ({ operationId }) => ({ id: operationId }));
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write
    });

    const ids = Array.from({ length: 50 }, (_, index) => {
      const suffix = (index + 1).toString(16).padStart(12, "0");
      return `aaaaaaaa-aaaa-4aaa-8aaa-${suffix}`;
    });

    const results = await Promise.all(ids.map((operationId) =>
      coordinator.execute(request({ operationId }))
    ));

    expect(new Set(results.map((result) => result.id)).size).toBe(50);
    expect(write).toHaveBeenCalledTimes(50);
    expect(coordinator.getPendingCount()).toBe(0);
    expect(coordinator.getCompletedCount()).toBe(50);
  });

  test("33. evicts old completed entries under sustained load", async () => {
    const write = vi.fn(async ({ operationId }) => ({ id: operationId }));
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write,
      maxCompleted: 10
    });

    const ids = Array.from({ length: 40 }, (_, index) => {
      const suffix = (index + 1).toString(16).padStart(12, "0");
      return `bbbbbbbb-bbbb-4bbb-8bbb-${suffix}`;
    });

    for (const operationId of ids) {
      await coordinator.execute(request({ operationId }));
    }

    expect(coordinator.getCompletedCount()).toBe(10);
    await coordinator.execute(request({ operationId: ids[0] }));
    expect(write).toHaveBeenCalledTimes(41);
    expect(coordinator.getCompletedCount()).toBe(10);
  });

  test("34. destroy invalidates a burst of pending writes", async () => {
    const gate = deferred();
    const write = vi.fn(async () => gate.promise);
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write
    });

    const pending = Array.from({ length: 30 }, () =>
      coordinator.execute(request())
    );

    await vi.waitFor(() => {
      expect(coordinator.getPendingCount()).toBe(1);
    });

    coordinator.destroy();
    gate.resolve({ id: OPERATION_ID });

    const settled = await Promise.allSettled(pending);
    expect(settled).toHaveLength(30);
    expect(settled.every((item) =>
      item.status === "rejected" &&
      item.reason.message === "Write operation invalidated."
    )).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(coordinator.getPendingCount()).toBe(0);
    expect(coordinator.getCompletedCount()).toBe(0);
  });

  test("35. invalidation prevents stale writes from polluting a new generation", async () => {
    const oldGate = deferred();
    const write = vi.fn()
      .mockImplementationOnce(async () => oldGate.promise)
      .mockResolvedValueOnce({ id: OPERATION_ID, content: "New generation" });
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write
    });

    const stale = coordinator.execute(request());
    await vi.waitFor(() => {
      expect(coordinator.getPendingCount()).toBe(1);
    });

    coordinator.invalidate();

    const fresh = await coordinator.execute(
      request({ content: "New generation" })
    );
    oldGate.resolve({ id: OPERATION_ID, content: "Old generation" });
    await expect(stale).rejects.toThrow("Write operation invalidated.");

    expect(coordinator.getCompletedCount()).toBe(1);
    expect(coordinator.getPendingCount()).toBe(0);
    await expect(
      coordinator.execute(request({ content: "New generation" }))
    ).resolves.toEqual(fresh);
    expect(write).toHaveBeenCalledTimes(2);
  });
});

/* ============================================
   PHASE 22.16.5.8.9 — FAILURE AND IDENTITY
============================================ */

describe("Advanced Failure Recovery and Identity Isolation", () => {
  test("36. an authentication lookup failure never starts a write", async () => {
    const write = vi.fn(async () => ({ id: OPERATION_ID }));
    const coordinator = createPrivateWriteCoordinator({
      getUserId: vi.fn().mockRejectedValueOnce(
        new Error("Authentication service unavailable")
      ).mockResolvedValue(USER_A),
      write
    });

    await expect(coordinator.execute(request())).rejects.toThrow(
      "Authentication service unavailable"
    );
    expect(write).not.toHaveBeenCalled();

    await expect(coordinator.execute(request())).resolves.toEqual({
      id: OPERATION_ID
    });
    expect(write).toHaveBeenCalledTimes(1);
  });

  test("37. switching accounts does not reuse another account's completed result", async () => {
    let userId = USER_A;
    const write = vi.fn(async ({ userId: owner }) => ({ owner }));
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => userId,
      write
    });

    const first = await coordinator.execute(request());
    expect(first.owner).toBe(USER_A);

    userId = USER_B;
    const second = await coordinator.execute(request());
    expect(second.owner).toBe(USER_B);
    expect(write).toHaveBeenCalledTimes(2);
    expect(coordinator.getCompletedCount()).toBe(1);
  });

  test("38. account change invalidates the previous account's pending write", async () => {
    const oldGate = deferred();
    let userId = USER_A;
    const write = vi.fn()
      .mockImplementationOnce(async () => oldGate.promise)
      .mockResolvedValueOnce({ owner: USER_B });
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => userId,
      write
    });

    const oldWrite = coordinator.execute(request());
    await vi.waitFor(() => {
      expect(coordinator.getPendingCount()).toBe(1);
    });

    userId = USER_B;
    const newWrite = await coordinator.execute(request());
    expect(newWrite.owner).toBe(USER_B);

    oldGate.resolve({ owner: USER_A });
    await expect(oldWrite).rejects.toThrow("Write operation invalidated.");
    expect(coordinator.getCompletedCount()).toBe(1);
    expect(write).toHaveBeenCalledTimes(2);
  });

  test("39. a write failure leaves no completed result and allows retry", async () => {
    const write = vi.fn()
      .mockRejectedValueOnce(new Error("Storage unavailable"))
      .mockResolvedValueOnce({ id: OPERATION_ID });
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => USER_A,
      write
    });

    await expect(coordinator.execute(request())).rejects.toThrow(
      "Storage unavailable"
    );
    expect(coordinator.getPendingCount()).toBe(0);
    expect(coordinator.getCompletedCount()).toBe(0);

    await expect(coordinator.execute(request())).resolves.toEqual({
      id: OPERATION_ID
    });
    expect(write).toHaveBeenCalledTimes(2);
    expect(coordinator.getCompletedCount()).toBe(1);
  });

  test("40. a signed-out request clears cached results before a new sign-in", async () => {
    let userId = USER_A;
    const write = vi.fn(async ({ userId: owner }) => ({ owner }));
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => userId,
      write
    });

    await coordinator.execute(request());
    expect(coordinator.getCompletedCount()).toBe(1);

    userId = null;
    await expect(coordinator.execute(request())).rejects.toThrow(
      "Authentication required."
    );
    expect(coordinator.getCompletedCount()).toBe(0);

    userId = USER_A;
    await coordinator.execute(request());
    expect(write).toHaveBeenCalledTimes(2);
    expect(coordinator.getCompletedCount()).toBe(1);
  });
});

/* ============================================
   PHASE 22.16.5.8.10 — FINAL INTEGRITY
============================================ */

describe("Final Integrity and Production Readiness", () => {
  test("41. invalidation during pending identity lookup prevents a stale write", async () => {
    const identityGate = deferred();
    const write = vi.fn(async () => ({ id: OPERATION_ID }));
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => identityGate.promise,
      write
    });

    const pending = coordinator.execute(request());
    coordinator.invalidate();
    identityGate.resolve(USER_A);

    await expect(pending).rejects.toThrow("Write operation invalidated.");
    expect(write).not.toHaveBeenCalled();
    expect(coordinator.getPendingCount()).toBe(0);
    expect(coordinator.getCompletedCount()).toBe(0);
  });

  test("42. destruction during pending identity lookup prevents any write", async () => {
    const identityGate = deferred();
    const write = vi.fn(async () => ({ id: OPERATION_ID }));
    const coordinator = createPrivateWriteCoordinator({
      getUserId: async () => identityGate.promise,
      write
    });

    const pending = coordinator.execute(request());
    coordinator.destroy();
    identityGate.resolve(USER_A);

    await expect(pending).rejects.toThrow("Write coordinator is destroyed.");
    expect(write).not.toHaveBeenCalled();
    expect(coordinator.isDestroyed()).toBe(true);
  });

  test("43. conflicting payload cannot reuse a completed operation key", async () => {
    const { coordinator, write } = createHarness();
    await coordinator.execute(request());

    await expect(
      coordinator.execute(request({ content: "Changed payload" }))
    ).rejects.toThrow("Operation ID reused with different content.");

    expect(write).toHaveBeenCalledTimes(1);
    expect(coordinator.getCompletedCount()).toBe(1);
  });

  test("44. public coordinator methods remain stable and frozen", () => {
    const { coordinator } = createHarness();
    expect(Object.isFrozen(coordinator)).toBe(true);
    expect(Object.keys(coordinator).sort()).toEqual([
      "destroy",
      "execute",
      "getCompletedCount",
      "getPendingCount",
      "invalidate",
      "isDestroyed"
    ].sort());
    expect(PRIVATE_WRITE_COORDINATOR_VERSION).toBe("1.0.0");
  });

  test("45. an invalid request never invokes identity lookup or storage", async () => {
    const getUserId = vi.fn(async () => USER_A);
    const write = vi.fn(async () => ({ id: OPERATION_ID }));
    const coordinator = createPrivateWriteCoordinator({ getUserId, write });

    await expect(
      coordinator.execute(request({ content: "  " }))
    ).rejects.toThrow("Invalid message content.");
    await expect(
      coordinator.execute(request({ operationId: "invalid" }))
    ).rejects.toThrow("Invalid operation ID.");

    expect(getUserId).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
});
