/**
 * Hyper XSUS Core — Recovery Incident Backend Runtime v1.0.0.
 * Server-only composition. Caller supplies a trusted Supabase client and
 * an authorization callback backed by verified server identity/permissions.
 * No network listener, browser credentials, or automatic recovery.
 */
import { createSupabaseRecoveryIncidentHistoryAdapter } from "./supabase-recovery-incident-history-adapter.js";
import { createRecoveryIncidentHistoryEngine } from "./recovery-incident-history-engine.js";
import { createRecoveryIncidentTriageEngine } from "./recovery-incident-triage-engine.js";
import { createRecoveryIncidentTrendEngine } from "./recovery-incident-trend-engine.js";

export const RECOVERY_INCIDENT_BACKEND_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export function createRecoveryIncidentBackendRuntime({
  client, verifyIdentity, authorizeScope, maxEntries = 500, maxIncidents = 10000
} = {}) {
  if (typeof verifyIdentity !== "function" || typeof authorizeScope !== "function") {
    throw new TypeError("Recovery incident backend requires identity verification and scope authorization.");
  }
  const storage = createSupabaseRecoveryIncidentHistoryAdapter({ client });
  const history = createRecoveryIncidentHistoryEngine({
    storage, maxEntries, maxIncidents,
    authorize: async ({ scope, actorId, action }) =>
      await authorizeScope({ scope, actorId, action }) === true
  });
  const triage = createRecoveryIncidentTriageEngine({ maxRecords: maxIncidents });
  const trends = createRecoveryIncidentTrendEngine({ maxIncidents });

  async function identity(token) {
    if (typeof token !== "string" || token.length < 1 || token.length > 8192) {
      throw new Error("Recovery incident backend authentication required.");
    }
    let result;
    try { result = await verifyIdentity({ token }); }
    catch { throw new Error("Recovery incident backend authentication failed."); }
    if (!result || typeof result.actorId !== "string" || !ID.test(result.actorId)) {
      throw new Error("Recovery incident backend authentication failed.");
    }
    return result.actorId;
  }
  async function read({ token, scope } = {}) {
    const actorId = await identity(token);
    return history.read({ scope, actorId });
  }
  async function append({ token, scope, previous, current } = {}) {
    const actorId = await identity(token);
    return history.append({ scope, actorId, previous, current });
  }
  async function analyze({ token, scope, previousReport, currentReport } = {}) {
    const actorId = await identity(token);
    if (typeof scope !== "string" || !ID.test(scope)) {
      throw new TypeError("Invalid recovery incident backend scope.");
    }
    if (await authorizeScope({ scope, actorId, action: "history.analyze" }) !== true) {
      throw new Error("Recovery incident backend access denied.");
    }
    const previous = triage.assess(previousReport);
    const current = triage.assess(currentReport);
    return Object.freeze({ previous, current,
      trend: trends.compare({ scope, previous, current }),
      readOnly: true, automaticRecoveryAllowed: false });
  }
  return Object.freeze({
    version: RECOVERY_INCIDENT_BACKEND_VERSION, read, append, analyze
  });
}
