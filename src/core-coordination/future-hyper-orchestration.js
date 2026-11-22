import {CoordinationError,validateLanguageResult} from "./phase-12-5.js";
import {createFutureHttpAdapter} from "./real-adapters.js";
import {createHyperSixEngineAdapter,SIX_ENGINE_STAGE_NAMES} from "./six-engine-adapter.js";

export function createFutureHyperOrchestration({
  token,fetchImpl,orchestration,contractVersion,requestId,principalId
}={}) {
  const future=createFutureHttpAdapter({token,fetchImpl});
  const hyper=createHyperSixEngineAdapter({orchestration,contractVersion,requestId,principalId});
  return Object.freeze({
    supportedStages:SIX_ENGINE_STAGE_NAMES,
    async review({goal,inputs,signal}={}) {
      if (typeof goal !== "string" || !goal.trim() || goal.length > 4096)
        throw new CoordinationError("invalid_request");
      if (signal?.aborted) throw new CoordinationError("aborted");
      const language=validateLanguageResult(await future.reviewLanguage({text:goal,signal}));
      if (signal?.aborted) throw new CoordinationError("aborted");
      // Do not inject arbitrary language text into unrelated engine payloads.
      // Callers must supply separately validated, engine-specific inputs.
      const orchestrationResult=await hyper.reviewStages({inputs,signal});
      if (signal?.aborted) throw new CoordinationError("aborted");
      return Object.freeze({
        contractVersion:"12.5.6",status:"review_required",
        language,orchestration:orchestrationResult,
        safety:Object.freeze({executable:false,sideEffects:false})
      });
    }
  });
}
