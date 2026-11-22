import {CoordinationError} from "./phase-12-5.js";
export const SIX_ENGINE_STAGE_NAMES = Object.freeze(["truth","learning","planning","execution","improvement","agents"]);
const valid = s => typeof s === "string" && s.trim().length > 0 && s.length <= 4096;
export function createHyperSixEngineAdapter({orchestration,contractVersion,requestId,principalId}={}) {
  if (typeof orchestration?.coordinateSixEngines !== "function" ||
      !valid(contractVersion) || !valid(requestId) || !valid(principalId))
    throw new CoordinationError("invalid_orchestration_adapter");
  return Object.freeze({
    async reviewStages({inputs,signal}={}) {
      if (signal?.aborted) throw new CoordinationError("aborted");
      if (!inputs || typeof inputs !== "object" || Array.isArray(inputs) ||
          Object.keys(inputs).length === 0 ||
          Object.keys(inputs).some(key=>!SIX_ENGINE_STAGE_NAMES.includes(key) ||
            !inputs[key] || typeof inputs[key] !== "object" || Array.isArray(inputs[key])))
        throw new CoordinationError("invalid_stage_inputs");
      const response=await orchestration.coordinateSixEngines({
        contractVersion,requestId,engineId:"six-engine-orchestration",
        operation:"orchestration.coordinate",payload:{inputs},
        context:{traceId:requestId,principalId,authorizationRef:"supabase-user-session"}
      });
      if (signal?.aborted) throw new CoordinationError("aborted");
      const result=response?.result;
      if (response?.status !== "success" || result?.state !== "review_required" ||
          result?.authorizedForExecution !== false || result?.sideEffects !== false ||
          !Array.isArray(result.stages) || result.stages.length > 6 ||
          result.stages.some(s=>!SIX_ENGINE_STAGE_NAMES.includes(s.stage) ||
            !["success","rejected"].includes(s.status)))
        throw new CoordinationError("invalid_orchestration_result");
      return Object.freeze({
        status:"review_required",authorizedForExecution:false,sideEffects:false,
        stages:Object.freeze(result.stages.map(s=>Object.freeze({stage:s.stage,status:s.status})))
      });
    }
  });
}
