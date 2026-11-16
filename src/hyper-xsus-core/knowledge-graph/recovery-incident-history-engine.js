/**
 * Hyper XSUS Core — Recovery Incident History v1.0.0
 * Durable history requires an injected, atomic compare-and-swap adapter.
 * Adapter: read(scope) => { revision, entries }; compareAndSwap(scope, expectedRevision, next) => boolean.
 * This module does not provide persistence, authorization, or automatic recovery.
 */
import { createRecoveryIncidentTrendEngine } from "./recovery-incident-trend-engine.js";
export const RECOVERY_INCIDENT_HISTORY_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const KINDS = ["added", "resolved", "escalated", "deescalated", "unchanged"];
const validRevision = n => Number.isSafeInteger(n) && n >= 0;
const fail = () => { throw new Error("Recovery incident history integrity failure."); };
function validateEntry(entry, scope, previous = null) {
  if (!entry || entry.version !== RECOVERY_INCIDENT_HISTORY_VERSION ||
      entry.scope !== scope || !validRevision(entry.previousRevision) ||
      !validRevision(entry.currentRevision) ||
      entry.currentRevision <= entry.previousRevision ||
      (previous && entry.previousRevision !== previous.currentRevision) ||
      typeof entry.requiresManualReview !== "boolean" ||
      entry.readOnly !== true || entry.automaticRecoveryAllowed !== false) fail();
  const all = new Set();
  for (const kind of KINDS) {
    const ids = entry[kind];
    if (!Array.isArray(ids)) fail();
    let last = null;
    for (const id of ids) {
      if (typeof id !== "string" || !ID.test(id) ||
          (last !== null && id <= last) || all.has(id)) fail();
      all.add(id); last = id;
    }
  }
  if (entry.requiresManualReview !== (entry.added.length > 0 || entry.escalated.length > 0)) fail();
}
function validateSnapshot(snapshot, scope, maxEntries) {
  if (!snapshot || !validRevision(snapshot.revision) ||
      !Array.isArray(snapshot.entries) ||
      snapshot.entries.length > maxEntries ||
      snapshot.revision !== snapshot.entries.length) fail();
  let previous = null;
  for (const entry of snapshot.entries) {
    validateEntry(entry, scope, previous);
    previous = entry;
  }
  return snapshot;
}
function cloneEntry(entry) {
  return Object.freeze({ ...entry, ...Object.fromEntries(
    KINDS.map(kind => [kind, Object.freeze([...entry[kind]])])
  ) });
}
export function createRecoveryIncidentHistoryEngine({
  storage, authorize, maxEntries = 500, maxIncidents = 10000
} = {}) {
  if (!storage || typeof storage.read !== "function" ||
      typeof storage.compareAndSwap !== "function" ||
      typeof authorize !== "function" ||
      !Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 10000) {
    throw new TypeError("Invalid recovery incident history configuration.");
  }
  const trend = createRecoveryIncidentTrendEngine({ maxIncidents });
  async function access(scope, actorId, action) {
    if (typeof scope !== "string" || !ID.test(scope) ||
        typeof actorId !== "string" || !ID.test(actorId)) {
      throw new TypeError("Invalid recovery incident history identity.");
    }
    if (await authorize({ scope, actorId, action }) !== true) {
      throw new Error("Recovery incident history access denied.");
    }
  }
  async function read({ scope, actorId } = {}) {
    await access(scope, actorId, "history.read");
    const snapshot = validateSnapshot(await storage.read(scope), scope, maxEntries);
    return Object.freeze({ version: RECOVERY_INCIDENT_HISTORY_VERSION,
      scope, revision: snapshot.revision,
      entries: Object.freeze(snapshot.entries.map(cloneEntry)),
      readOnly: true });
  }
  async function append({ scope, actorId, previous, current } = {}) {
    await access(scope, actorId, "history.append");
    const delta = trend.compare({ scope, previous, current });
    const snapshot = validateSnapshot(await storage.read(scope), scope, maxEntries);
    if (snapshot.entries.length >= maxEntries) {
      throw new Error("Recovery incident history capacity reached.");
    }
    const last = snapshot.entries.at(-1);
    if (last && last.currentRevision !== delta.previousRevision) {
      throw new Error("Recovery incident history revision continuity failure.");
    }
    const entry = cloneEntry({
      ...delta, version: RECOVERY_INCIDENT_HISTORY_VERSION
    });
    const next = { revision: snapshot.revision + 1,
      entries: [...snapshot.entries.map(cloneEntry), entry] };
    if (await storage.compareAndSwap(scope, snapshot.revision, next) !== true) {
      throw new Error("Recovery incident history concurrent update; retry from fresh state.");
    }
    return Object.freeze({ revision: next.revision, entry, persisted: true });
  }
  return Object.freeze({ version: RECOVERY_INCIDENT_HISTORY_VERSION, read, append });
}
