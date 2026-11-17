import {request,result,string,EngineContractError} from "../contracts.js";
export const ENGINE_ID="learning";
export function proposeLearning(input) {
  const req=request(input,ENGINE_ID,"learning.propose");
  const content=string(req.payload.content,"content");
  const sourceRef=string(req.payload.sourceRef,"sourceRef");
  if(content.length>10000 || sourceRef.length>512) throw new EngineContractError("INPUT_TOO_LARGE","Learning proposal exceeds limits");
  const normalized=content.trim().replace(/\s+/g," ");
  return result(req,{state:"proposed",verified:false,persisted:false,sourceRef,contentLength:normalized.length,requiresVerification:true});
}

export function evaluateLearningCandidate(input) {
  const req=request(input,ENGINE_ID,"learning.evaluateCandidate");
  const content=string(req.payload.content,"content");
  const sources=req.payload.sourceRefs;
  if(content.length>10000||!Array.isArray(sources)||sources.length>50) throw new EngineContractError("INVALID_INPUT","Invalid learning candidate");
  const refs=new Set();
  for(const source of sources){const ref=string(source,"sourceRef");if(ref.length>512)throw new EngineContractError("INPUT_TOO_LARGE","Source reference too long");refs.add(ref);}
  return result(req,{state:"awaiting_independent_verification",sourceCount:refs.size,duplicateSources:sources.length-refs.size,verified:false,persisted:false,eligibleForCommit:false});
}
