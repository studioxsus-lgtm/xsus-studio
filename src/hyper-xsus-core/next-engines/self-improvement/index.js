import {request,result,string,EngineContractError} from "../contracts.js";
export const ENGINE_ID="self-improvement";
export function analyzeImprovement(input) {
  const req=request(input,ENGINE_ID,"improvement.analyze");
  const baselineRef=string(req.payload.baselineRef,"baselineRef");
  if(baselineRef.length>512) throw new EngineContractError("INPUT_TOO_LARGE","Baseline reference exceeds limit");
  return result(req,{state:"pending_benchmark",baselineRef,changesApplied:false});
}

export function compareBenchmarks(input) {
  const req=request(input,ENGINE_ID,"improvement.compareBenchmarks");
  const {baseline,candidate}=req.payload;
  if(!baseline||!candidate||typeof baseline!=="object"||typeof candidate!=="object"||Array.isArray(baseline)||Array.isArray(candidate))throw new EngineContractError("INVALID_INPUT","Benchmarks must be objects");
  const keys=Object.keys(baseline);
  if(keys.length===0||keys.length>50||Object.keys(candidate).length!==keys.length)throw new EngineContractError("INVALID_INPUT","Invalid benchmark dimensions");
  const deltas={};
  for(const key of keys){
    if(!Object.hasOwn(candidate,key)||!Number.isFinite(baseline[key])||!Number.isFinite(candidate[key]))throw new EngineContractError("INVALID_INPUT","Benchmark values must be finite and aligned");
    deltas[key]=candidate[key]-baseline[key];
  }
  return result(req,{deltas,state:"review_required",changesApplied:false,independentlyBenchmarked:false});
}
