import { createXsusCoreClient, XsusCoreApiError } from "./xsus-core-client.js";

const API_BASE = "https://future-xsus-core-api.onrender.com";
const STATES = new Set(["resolved", "partial", "abstained", "proposed"]);
const OPERATIONS = new Set(["reason", "solve", "infer", "search", "unrecognized"]);

export function createAppIntelligenceV2({ supabase, enabled = false, fetchImpl = globalThis.fetch, baseUrl = API_BASE }) {
  if (typeof enabled !== "boolean") throw new TypeError("Explicit feature flag required");
  if (typeof supabase?.auth?.getSession !== "function") throw new TypeError("Supabase client required");
  let busy = false;
  async function session() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.user?.id || !data.session.access_token)
      throw new XsusCoreApiError(401, "unauthorized", "Sign in to use XSUS Core");
    return data.session;
  }
  return Object.freeze({
    async respond({ requestId, text, facts = [], rules = [] } = {}) {
      if (!enabled) throw new XsusCoreApiError(404, "disabled", "Intelligence V2 is disabled");
      if (busy) throw new XsusCoreApiError(409, "busy", "A request is already active");
      if (typeof requestId !== "string" || !/^[a-z][a-z0-9_-]{0,63}$/.test(requestId) ||
          typeof text !== "string" || !text.trim() || text.length > 2000 ||
          !Array.isArray(facts) || !Array.isArray(rules)) {
        throw new TypeError("Invalid V2 request");
      }
      busy = true;
      try {
        const initial = await session();
        const client = createXsusCoreClient({ baseUrl, getAccessToken: async () => initial.access_token, fetchImpl });
        const result = await client.respondV2({ requestId, text, facts, rules });
        const current = await session();
        if (current.user.id !== initial.user.id)
          throw new XsusCoreApiError(401, "identity_changed", "Session identity changed");
        return result;
      } finally {
        busy = false;
      }
    }
  });
}

export function validateIntelligenceV2(result, requestId) {
  if (!result || result.contractVersion !== "2.0.0" || result.requestId !== requestId ||
      !STATES.has(result.status) || !OPERATIONS.has(result.operation) ||
      typeof result.text !== "string" || !result.text.trim() ||
      !Number.isSafeInteger(result.memoryRevision) || result.memoryRevision < 0 ||
      !Array.isArray(result.limitations) || result.limitations.some(x => typeof x !== "string") ||
      result.executionAuthorized !== false || result.externalTruthVerified !== false) {
    throw new XsusCoreApiError(502, "invalid_response", "Invalid intelligence V2 contract");
  }
  return result;
}
