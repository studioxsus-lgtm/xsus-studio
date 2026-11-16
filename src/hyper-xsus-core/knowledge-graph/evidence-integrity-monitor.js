/**
 * Hyper XSUS Core — Evidence Integrity Monitor v1.0.0
 * Deterministic pull-based health trend detection, without timers or
 * external notification dependencies. Caller owns scheduling and alerts.
 */
export const EVIDENCE_INTEGRITY_MONITOR_VERSION = "1.0.0";
const freeze = value => Object.freeze(value);
export function createEvidenceIntegrityMonitor({
  supervisor, notify, degradedThreshold = 3, historyLimit = 100
} = {}) {
  if (!supervisor || typeof supervisor.check !== "function") {
    throw new TypeError("supervisor.check is required.");
  }
  if (notify !== undefined && typeof notify !== "function") {
    throw new TypeError("notify must be a function.");
  }
  if (!Number.isInteger(degradedThreshold) || degradedThreshold < 1 || degradedThreshold > 1000 ||
      !Number.isInteger(historyLimit) || historyLimit < 1 || historyLimit > 10000) {
    throw new TypeError("Invalid evidence monitor limits.");
  }
  let degradedStreak = 0;
  let incident = null;
  let incidentId = 0;
  let queue = Promise.resolve();
  const history = [];
  let closed = false;
  function serial(fn) {
    const result = queue.then(fn);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }
  async function poll() {
    return serial(async () => {
      if (closed) throw new Error("Evidence monitor is closed.");
      let health;
      try {
        health = await supervisor.check();
      } catch {
        health = { ready: false, status: "degraded", reason: "health-check-failed", timestamp: null };
      }
      if (health.ready === true) degradedStreak = 0;
      else degradedStreak++;
      let transition = null;
      if (degradedStreak >= degradedThreshold && incident === null) {
        incident = freeze({
          id: ++incidentId, status: "open", reason: health.reason ?? "unknown",
          openedAt: health.timestamp ?? null
        });
        transition = "opened";
      } else if (health.ready === true && incident !== null) {
        incident = freeze({ ...incident, status: "resolved", resolvedAt: health.timestamp ?? null });
        transition = "resolved";
      }
      const result = freeze({
        ready: health.ready === true, reason: health.reason ?? "unknown",
        degradedStreak, incident, transition, timestamp: health.timestamp ?? null
      });
      history.push(result);
      if (history.length > historyLimit) history.shift();
      if (transition === "resolved") incident = null;
      if (transition && notify) {
        try { await notify(result); }
        catch { /* Notification failures never change integrity classification. */ }
      }
      return result;
    });
  }
  function recent(limit = historyLimit) {
    if (!Number.isInteger(limit) || limit < 1 || limit > historyLimit) {
      throw new TypeError("Invalid monitor history limit.");
    }
    return freeze(history.slice(-limit));
  }
  function status() {
    return freeze({ closed, degradedStreak, activeIncident: incident });
  }
  function close() { closed = true; }
  return freeze({ version: EVIDENCE_INTEGRITY_MONITOR_VERSION, poll, recent, status, close });
}
