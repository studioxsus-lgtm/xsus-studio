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
