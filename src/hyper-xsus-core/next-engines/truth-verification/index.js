import {request,result,string,EngineContractError} from "../contracts.js";
export const ENGINE_ID="truth-verification";
export function verifyClaim(input) {
  const req=request(input,ENGINE_ID,"truth.verifyClaim");
  string(req.payload.claim,"claim");
  if (!Array.isArray(req.payload.evidence)) throw new EngineContractError("INVALID_INPUT","evidence must be an array");
  // Never infer truth merely from user-provided evidence. A trusted verifier is a separate dependency.
  return result(req,{verdict:"insufficient_evidence",evidenceCount:req.payload.evidence.length,independentlyVerified:false});
}
