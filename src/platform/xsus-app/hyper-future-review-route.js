import {randomUUID} from "node:crypto";
import {createFutureHttpAdapter} from "../../core-coordination/real-adapters.js";
import {createHyperSixEngineAdapter} from "../../core-coordination/six-engine-adapter.js";
import {validateLanguageResult,CoordinationError} from "../../core-coordination/phase-12-5.js";
import {orchestration,NEXT_ENGINES_CONTRACT_VERSION} from "../../hyper-xsus-core/next-engines/index.js";

export const HYPER_FUTURE_REVIEW_PATH="/api/xsus-app/hyper-future/review";
export const HYPER_FUTURE_REVIEW_VERSION="12.5.8";
const STAGES=new Set(["truth","learning","planning","execution","improvement","agents"]);
const valid=s=>typeof s==="string"&&s.trim().length>0&&s.length<=4096;
function validInputs(inputs) {
  if(!inputs||typeof inputs!=="object"||Array.isArray(inputs))return false;
  const keys=Object.keys(inputs);
  if(!keys.length||keys.length>6||keys.some(k=>!STAGES.has(k)))return false;
  if(keys.some(k=>!inputs[k]||typeof inputs[k]!=="object"||Array.isArray(inputs[k])))return false;
  try {return JSON.stringify(inputs).length<=16384;} catch{return false;}
}
export function createHyperFutureReviewRoute({
  verifyUser,fetchImpl=globalThis.fetch,makeRequestId=randomUUID,
  hyperOrchestration=orchestration
}={}) {
  if(typeof verifyUser!=="function"||typeof fetchImpl!=="function"||
     typeof makeRequestId!=="function"||typeof hyperOrchestration?.coordinateSixEngines!=="function")
    throw new TypeError("Review route requires trusted server dependencies.");
  return Object.freeze({
    path:HYPER_FUTURE_REVIEW_PATH,version:HYPER_FUTURE_REVIEW_VERSION,
    async handle({method="POST",authorization,body}={}) {
      if(method!=="POST")return {status:405,data:{error:"Method not allowed."}};
      if(typeof authorization!=="string"||!/^Bearer\s+\S+$/i.test(authorization))
        return {status:401,data:{error:"Authentication required."}};
      let user;
      try {user=await verifyUser(authorization);} catch {
        return {status:403,data:{error:"Access denied."}};
      }
      if(!valid(user?.userId)||!valid(user?.token))
        return {status:403,data:{error:"Access denied."}};
      if(!body||typeof body!=="object"||Array.isArray(body)||
        Object.keys(body).some(k=>!["goal","inputs"].includes(k))||
        !valid(body.goal)||!validInputs(body.inputs))
        return {status:400,data:{error:"Invalid review request."}};
      const requestId=makeRequestId();
      try {
        const future=createFutureHttpAdapter({token:user.token,fetchImpl});
        const language=validateLanguageResult(await future.reviewLanguage({text:body.goal}));
        const hyper=createHyperSixEngineAdapter({
          orchestration:hyperOrchestration,contractVersion:NEXT_ENGINES_CONTRACT_VERSION,
          requestId,principalId:user.userId
        });
        const reviewed=await hyper.reviewStages({inputs:body.inputs});
        return {status:200,data:{
          bridgeVersion:HYPER_FUTURE_REVIEW_VERSION,requestId,status:"review_required",
          language:{core:language.core,status:language.status,text:language.text},
          orchestration:reviewed,safety:{executable:false,sideEffects:false}
        }};
      } catch(error) {
        const status=error instanceof CoordinationError &&
          ["language_review_required","invalid_language_result","invalid_orchestration_result","invalid_stage_inputs"].includes(error.code)
          ?422:503;
        return {status,data:{error:status===422?"Review requires correction.":"Review service temporarily unavailable."}};
      }
    }
  });
}
