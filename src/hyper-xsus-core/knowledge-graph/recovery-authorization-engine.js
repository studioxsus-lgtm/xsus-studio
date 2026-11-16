/**
 * Hyper XSUS Core — Recovery Authorization Engine v1.0.0
 * Two-person authorization for a narrowly scoped recovery decision.
 * Does NOT mutate anchors, checkpoints or graph data.
 * Decisions are ephemeral; production approval requires durable storage,
 * authenticated actor identity and independently verified commit evidence.
 */
export const RECOVERY_AUTHORIZATION_VERSION = "1.0.0";
const HASH = /^[0-9a-f]{64}$/;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const freeze = value => Object.freeze(value);

export function createRecoveryAuthorizationEngine({
  inspect, authorize, verifyCommitProof, clock = () => Date.now(), maxRequests = 1000
} = {}) {
  if (typeof inspect !== "function" || typeof authorize !== "function" ||
      typeof verifyCommitProof !== "function") {
    throw new TypeError("inspect, authorize and verifyCommitProof callbacks are required.");
  }
  if (typeof clock !== "function" || !Number.isInteger(maxRequests) ||
      maxRequests < 1 || maxRequests > 10000) {
    throw new TypeError("Invalid recovery authorization configuration.");
  }
  const requests = new Map();
  let sequence = 0;
  let pending = Promise.resolve();
  function serial(task) {
    const next = pending.then(task);
    pending = next.then(() => undefined, () => undefined);
    return next;
  }
  function actor(value) {
    if (typeof value !== "string" || !KEY.test(value)) throw new TypeError("Invalid actor ID.");
    return value;
  }
  async function allowed(action, actorId, key) {
    if (await authorize({ action, actorId, key }) !== true) throw new Error("Recovery access denied.");
  }
  async function propose({ actorId, key, trustedHead, checkpointHead, proof }) {
    return serial(async () => {
      actor(actorId);
      if (typeof key !== "string" || !KEY.test(key) ||
          !HASH.test(trustedHead) || !HASH.test(checkpointHead) ||
          trustedHead === checkpointHead) throw new TypeError("Invalid recovery proposal.");
      await allowed("propose", actorId, key);
      if (requests.size >= maxRequests) throw new Error("Recovery request capacity reached.");
      const report = await inspect(key);
      if (report.status !== "possible-interrupted-anchor-update" ||
          report.trustedHead !== trustedHead || report.checkpointHead !== checkpointHead ||
          report.safeToWrite !== false) {
        throw new Error("Recovery state is not eligible.");
      }
      if (await verifyCommitProof({ key, trustedHead, checkpointHead, proof }) !== true) {
        throw new Error("Independent recovery commit proof rejected.");
      }
      const timestamp = clock();
      if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new TypeError("Invalid timestamp.");
      const id = "recovery-" + ++sequence;
      const request = freeze({
        id, key, trustedHead, checkpointHead, proposer: actorId,
        approvedBy: null, status: "pending", timestamp
      });
      requests.set(id, request);
      return request;
    });
  }
  async function approve({ id, actorId }) {
    return serial(async () => {
      actor(actorId);
      const current = requests.get(id);
      if (!current) throw new Error("Recovery request not found.");
      await allowed("approve", actorId, current.key);
      if (current.status !== "pending") throw new Error("Recovery request is not pending.");
      if (actorId === current.proposer) throw new Error("Recovery requires independent approver.");
      const report = await inspect(current.key);
      if (report.status !== "possible-interrupted-anchor-update" ||
          report.trustedHead !== current.trustedHead ||
          report.checkpointHead !== current.checkpointHead) {
        throw new Error("Recovery state changed; approval denied.");
      }
      const approved = freeze({ ...current, approvedBy: actorId, status: "approved" });
      requests.set(id, approved);
      return approved;
    });
  }
  async function revoke({ id, actorId }) {
    return serial(async () => {
      actor(actorId);
      const current = requests.get(id);
      if (!current) throw new Error("Recovery request not found.");
      await allowed("revoke", actorId, current.key);
      if (current.status === "revoked") return current;
      const revoked = freeze({ ...current, status: "revoked" });
      requests.set(id, revoked);
      return revoked;
    });
  }
  async function get({ id, actorId }) {
    actor(actorId);
    const current = requests.get(id);
    if (!current) throw new Error("Recovery request not found.");
    await allowed("read", actorId, current.key);
    return current;
  }
  return freeze({ version: RECOVERY_AUTHORIZATION_VERSION, propose, approve, revoke, get });
}
