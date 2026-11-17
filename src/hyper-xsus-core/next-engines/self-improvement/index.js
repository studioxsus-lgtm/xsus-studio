import {request,result,string,EngineContractError} from "../contracts.js";
export const ENGINE_ID="self-improvement";
export function analyzeImprovement(input) {
  const req=request(input,ENGINE_ID,"improvement.analyze");
  const baselineRef=string(req.payload.baselineRef,"baselineRef");
  if(baselineRef.length>512) throw new EngineContractError("INPUT_TOO_LARGE","Baseline reference exceeds limit");
  return result(req,{state:"pending_benchmark",baselineRef,changesApplied:false});
}
