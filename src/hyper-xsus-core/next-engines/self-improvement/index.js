import {request,result,string} from "../contracts.js";
export const ENGINE_ID="self-improvement";
export function analyzeImprovement(input) {
  const req=request(input,ENGINE_ID,"improvement.analyze");
  string(req.payload.baselineRef,"baselineRef");
  return result(req,{state:"pending_benchmark",baselineRef:req.payload.baselineRef,changesApplied:false});
}
