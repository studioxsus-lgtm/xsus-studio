/**
 * Hyper XSUS Core — Recovery Workflow Coordinator v1.0.0
 * Composes authorization, durable decision journaling and anchor execution.
 * Fail-closed: no anchor execution unless proposal and approval were journaled.
 * This is not a distributed transaction; a journal failure after a decision
 * transition requires operator reconciliation before further action.
 *
 * Authentication, independent proof verification and durable journal storage
 * are injected by the trusted backend.
 */
import { createRecoveryAuthorizationEngine } from "./recovery-authorization-engine.js";
import { createAuthorizedAnchorRecoveryExecutor } from "./authorized-anchor-recovery-executor.js";

export const RECOVERY_WORKFLOW_VERSION = "1.0.0";
const freeze = value => Object.freeze(value);
export function createRecoveryWorkflowCoordinator({
  inspector, anchor, journal, authorize, verifyCommitProof,
  clock = () => Date.now(), maxRequests = 1000
} = {}) {
  if (!inspector || typeof inspector.inspect !== "function" ||
      !anchor || typeof anchor.compareAndSwap !== "function" ||
      !journal || typeof journal.append !== "function" ||
      typeof authorize !== "function" || typeof verifyCommitProof !== "function" ||
      typeof clock !== "function") {
    throw new TypeError("Recovery workflow requires inspector, CAS anchor, journal, authorization, proof and clock.");
  }
  const blocked = new Set();
  const tracked = new Map();
  const authorization = createRecoveryAuthorizationEngine({
    inspect: key => inspector.inspect(key),
    authorize, verifyCommitProof, clock, maxRequests
  });
  const executor = createAuthorizedAnchorRecoveryExecutor({
    decisions: authorization, inspector, anchor, journal,
    authorize, verifyCommitProof, clock
  });
  let queue = Promise.resolve();
  function serial(fn) {
    const result = queue.then(fn);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }
  function ensure(key) {
    if (blocked.has(key)) {
      throw new Error("Recovery workflow requires manual reconciliation.");
    }
  }
  async function audit(decision, action, actorId) {
    try {
      return await journal.append({
        requestId: decision.id, actorId, action, timestamp: clock()
      });
    } catch (error) {
      blocked.add(decision.key);
      const failure = new Error("Recovery decision journal failed; manual reconciliation required.");
      failure.code = "RECOVERY_JOURNAL_FAILURE";
      throw failure;
    }
  }
  async function propose(input) {
    return serial(async () => {
      ensure(input?.key);
      const decision = await authorization.propose(input);
      tracked.set(decision.id, decision.key);
      await audit(decision, "proposed", input.actorId);
      return decision;
    });
  }
  async function approve(input) {
    return serial(async () => {
      ensure(tracked.get(input?.id));
      if (!tracked.has(input?.id)) throw new Error("Unknown recovery workflow request.");
      const decision = await authorization.approve(input);
      await audit(decision, "approved", input.actorId);
      return decision;
    });
  }
  async function revoke(input) {
    return serial(async () => {
      ensure(tracked.get(input?.id));
      if (!tracked.has(input?.id)) throw new Error("Unknown recovery workflow request.");
      const decision = await authorization.revoke(input);
      await audit(decision, "revoked", input.actorId);
      return decision;
    });
  }
  async function execute(input) {
    return serial(async () => {
      ensure(tracked.get(input?.id));
      if (!tracked.has(input?.id)) throw new Error("Unknown recovery workflow request.");
      try {
        return await executor.execute(input);
      } catch (error) {
        if (error.code === "RECOVERY_PARTIAL_COMMIT" ||
            /journal|CAS conflict/.test(error.message)) blocked.add(tracked.get(input.id));
        throw error;
      }
    });
  }
  async function inspect({ id, actorId }) {
    if (!tracked.has(id)) throw new Error("Unknown recovery workflow request.");
    const decision = await authorization.get({ id, actorId });
    return freeze({ decision, blocked: blocked.has(decision.key) });
  }
  return freeze({
    version: RECOVERY_WORKFLOW_VERSION,
    propose, approve, revoke, execute, inspect
  });
}
