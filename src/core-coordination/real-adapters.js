import {CoordinationError} from "./phase-12-5.js";

const FUTURE_ORIGIN = "https://future-xsus-core-api.onrender.com";
const valid = s => typeof s === "string" && s.trim().length > 0 && s.length <= 4096;
const safeId = s => typeof s === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(s);
export function createFutureHttpAdapter({token, fetchImpl = globalThis.fetch, origin = FUTURE_ORIGIN} = {}) {
  if (!valid(token) || typeof fetchImpl !== "function" || origin !== FUTURE_ORIGIN)
    throw new CoordinationError("invalid_future_adapter");
  return Object.freeze({
    async reviewLanguage({text, signal} = {}) {
      if (!valid(text)) throw new CoordinationError("invalid_request");
      const response = await fetchImpl(origin + "/v1/language/proofread", {
        method:"POST", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",Accept:"application/json"},
        body:JSON.stringify({text,language:"en"}),signal,redirect:"error"
      });
      if (!response.ok) throw new CoordinationError(response.status === 422 ? "language_review_required" : "engine_unavailable");
      const raw = await response.text();
      if (raw.length > 16384) throw new CoordinationError("invalid_language_result");
      let data;
      try { data = JSON.parse(raw); } catch { throw new CoordinationError("invalid_language_result"); }
      if (data?.language !== "en" || !valid(data.text) || typeof data.review_required !== "boolean" ||
          !["corrected","unchanged","partial","review_required"].includes(data.status))
        throw new CoordinationError("invalid_language_result");
      return {
        core:"future-xsus-core",text:data.text,
        status: data.status === "partial" ? "review_required" : data.status,
        review_required:data.review_required || data.status === "partial" || data.status === "review_required"
      };
    }
  });
}
export function createHyperPlanningAdapter({strategicPlanning,contractVersion,requestId,principalId,steps} = {}) {
  if (typeof strategicPlanning?.createPlan !== "function" || !valid(contractVersion) ||
      !safeId(requestId) || !safeId(principalId) || !Array.isArray(steps) ||
      steps.length < 1 || steps.length > 100 ||
      steps.some(step => !step || !safeId(step.id) || !valid(step.task) || !Array.isArray(step.dependsOn) ||
        step.dependsOn.length > 100 || step.dependsOn.some(id => !safeId(id))))
    throw new CoordinationError("invalid_hyper_adapter");
  return Object.freeze({
    async createDraftPlan({goal,signal} = {}) {
      if (!valid(goal) || signal?.aborted) throw new CoordinationError("aborted");
      const response = await strategicPlanning.createPlan({
        contractVersion,requestId,engineId:"strategic-planning",operation:"planning.create",
        payload:{goal,steps},
        context:{traceId:requestId,principalId,authorizationRef:"supabase-user-session"}
      });
      if (signal?.aborted) throw new CoordinationError("aborted");
      return {core:"hyper-xsus-core",...response.result};
    }
  });
}
