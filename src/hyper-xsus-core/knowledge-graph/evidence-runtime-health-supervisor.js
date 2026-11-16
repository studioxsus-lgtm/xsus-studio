/**
 * Hyper XSUS Core — Evidence Runtime Health Supervisor v1.0.0
 * Pull-based readiness and operational diagnostics. No background timers,
 * network server, or unauthenticated HTTP endpoint are created.
 */
export const EVIDENCE_RUNTIME_HEALTH_VERSION = "1.0.0";
const freeze = value => Object.freeze(value);

export function createEvidenceRuntimeHealthSupervisor({
  runtime, recoveryInspector, clock = () => Date.now(), historyLimit = 100
} = {}) {
  if (!runtime || typeof runtime.inspect !== "function") throw new TypeError("runtime.inspect is required.");
  if (!recoveryInspector || typeof recoveryInspector.inspect !== "function") {
    throw new TypeError("recoveryInspector.inspect is required.");
  }
  if (typeof clock !== "function") throw new TypeError("clock must be a function.");
  if (!Number.isInteger(historyLimit) || historyLimit < 1 || historyLimit > 1000) {
    throw new TypeError("historyLimit must be between 1 and 1000.");
  }
  let closed = false;
  const history = [];
  async function check() {
    if (closed) throw new Error("Evidence health supervisor is closed.");
    const timestamp = clock();
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
      throw new TypeError("Invalid health check timestamp.");
    }
    let recovery;
    try {
      recovery = await recoveryInspector.inspect();
    } catch {
      recovery = { status: "recovery-inspection-error", safeToWrite: false };
    }
    let runtimeState = null;
    let runtimeOk = false;
    if (recovery.safeToWrite === true) {
      try {
        runtimeState = await runtime.inspect();
        runtimeOk = runtimeState?.integrity?.valid === true &&
          Number.isSafeInteger(runtimeState.revision) &&
          Number.isSafeInteger(runtimeState.recordCount);
      } catch {
        runtimeOk = false;
      }
    }
    const ready = recovery.safeToWrite === true && runtimeOk;
    const result = freeze({
      timestamp, ready, status: ready ? "ready" : "degraded",
      reason: ready ? "verified" : recovery.safeToWrite !== true
        ? recovery.status : "runtime-inspection-error",
      revision: ready ? runtimeState.revision : null,
      recordCount: ready ? runtimeState.recordCount : null
    });
    history.push(result);
    if (history.length > historyLimit) history.shift();
    return result;
  }
  function recent(limit = historyLimit) {
    if (!Number.isInteger(limit) || limit < 1 || limit > historyLimit) {
      throw new TypeError("Invalid health history limit.");
    }
    return freeze(history.slice(-limit));
  }
  function close() { closed = true; }
  return freeze({ version: EVIDENCE_RUNTIME_HEALTH_VERSION, check, recent, close });
}
