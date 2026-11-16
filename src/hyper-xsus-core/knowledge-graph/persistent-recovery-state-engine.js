/**
 * Hyper XSUS Core — Persistent Recovery State Engine v1.0.0
 * CAS-backed state machine for recovery requests. A trusted server must
 * authenticate actor IDs and authorize actions before calling this engine.
 * Proofs and credentials are never stored. State changes are immutable,
 * owner-scoped by storage key, and monotonic.
 */
export const PERSISTENT_RECOVERY_STATE_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HASH = /^[a-f0-9]{64}$/;
const copy = x => JSON.parse(JSON.stringify(x));
const frozen = x => Object.freeze(x);
function validRecord(r) {
  return r && typeof r === "object" && !Array.isArray(r) &&
    ID.test(r.id) && ID.test(r.key) && ID.test(r.proposer) &&
    HASH.test(r.trustedHead) && HASH.test(r.checkpointHead) &&
    r.trustedHead !== r.checkpointHead &&
    ["pending", "approved", "executing", "revoked", "executed", "failed"].includes(r.status) &&
    Number.isSafeInteger(r.createdAt) && r.createdAt >= 0 &&
    (r.approvedBy === null || ID.test(r.approvedBy)) &&
    (r.status !== "approved" || (r.approvedBy && r.approvedBy !== r.proposer));
}
export function createPersistentRecoveryStateEngine({
  storage, key, clock = () => Date.now(), maxRequests = 1000
} = {}) {
  if (!storage || typeof storage.read !== "function" ||
      typeof storage.compareAndSwap !== "function" ||
      typeof key !== "string" || !ID.test(key) ||
      typeof clock !== "function" ||
      !Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > 10000) {
    throw new TypeError("Invalid persistent recovery state configuration.");
  }
  let queue = Promise.resolve();
  function serial(fn) {
    const p = queue.then(fn);
    queue = p.then(() => undefined, () => undefined);
    return p;
  }
  async function load() {
    const raw = await storage.read(key);
    if (raw === null) return { version: PERSISTENT_RECOVERY_STATE_VERSION, revision: 0, requests: {} };
    if (!raw || raw.version !== PERSISTENT_RECOVERY_STATE_VERSION ||
        !Number.isSafeInteger(raw.revision) || raw.revision < 1 ||
        !raw.requests || typeof raw.requests !== "object" || Array.isArray(raw.requests) ||
        Object.keys(raw.requests).length > maxRequests ||
        !Object.entries(raw.requests).every(([id, record]) =>
          id === record?.id && validRecord(record))) {
      throw new Error("Invalid persisted recovery state.");
    }
    return copy(raw);
  }
  async function mutate(fn) {
    return serial(async () => {
      const state = await load();
      const result = fn(state);
      const next = { ...state, revision: state.revision + 1 };
      if (await storage.compareAndSwap(key, state.revision, copy(next)) !== true) {
        throw new Error("Persistent recovery state CAS conflict.");
      }
      return frozen(copy(result));
    });
  }
  async function propose({ id, requestKey, proposer, trustedHead, checkpointHead }) {
    return mutate(state => {
      const timestamp = clock();
      const record = {
        id, key: requestKey, proposer, trustedHead, checkpointHead,
        approvedBy: null, status: "pending", createdAt: timestamp
      };
      if (!validRecord(record)) throw new TypeError("Invalid recovery proposal.");
      if (state.requests[id]) throw new Error("Duplicate recovery request.");
      if (Object.keys(state.requests).length >= maxRequests) throw new Error("Recovery state capacity exceeded.");
      state.requests[id] = record;
      return record;
    });
  }
  async function transition({ id, actorId, expectedStatus, nextStatus }) {
    return mutate(state => {
      if (!ID.test(id) || !ID.test(actorId)) throw new TypeError("Invalid recovery actor or request.");
      const current = state.requests[id];
      if (!current) throw new Error("Recovery request not found.");
      if (current.status !== expectedStatus) throw new Error("Recovery state transition conflict.");
      const permitted = (expectedStatus === "pending" && ["approved", "revoked"].includes(nextStatus)) ||
        (expectedStatus === "approved" && ["executing", "executed", "failed", "revoked"].includes(nextStatus)) ||
        (expectedStatus === "executing" && ["executed", "failed"].includes(nextStatus));
      if (!permitted) throw new Error("Invalid recovery state transition.");
      if (nextStatus === "approved" && actorId === current.proposer) {
        throw new Error("Recovery approval requires independent actor.");
      }
      const updated = {
        ...current, status: nextStatus,
        approvedBy: nextStatus === "approved" ? actorId : current.approvedBy
      };
      state.requests[id] = updated;
      return updated;
    });
  }
  async function get(id) {
    if (typeof id !== "string" || !ID.test(id)) throw new TypeError("Invalid recovery request ID.");
    const state = await load();
    return state.requests[id] ? frozen(copy(state.requests[id])) : null;
  }
  async function snapshot() { return frozen(await load()); }
  return frozen({ version: PERSISTENT_RECOVERY_STATE_VERSION, propose, transition, get, snapshot });
}
