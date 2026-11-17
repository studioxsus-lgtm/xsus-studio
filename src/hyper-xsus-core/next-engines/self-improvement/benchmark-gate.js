import {EngineContractError,object,string} from "../contracts.js";
export function evaluateBenchmarkGate({baseline,candidate,minimums={}}) {
  object(baseline,"baseline");object(candidate,"candidate");object(minimums,"minimums");
  const metrics=Object.keys(baseline);
  if(!metrics.length||metrics.length>50||Object.keys(candidate).length!==metrics.length)throw new EngineContractError("INVALID_INPUT","Mismatched metrics");
  const regressions=[];
  for(const metric of metrics){
    string(metric,"metric");
    if(!Object.hasOwn(candidate,metric)||!Number.isFinite(baseline[metric])||!Number.isFinite(candidate[metric]))throw new EngineContractError("INVALID_INPUT","Nonfinite metric");
    const threshold=Object.hasOwn(minimums,metric)?minimums[metric]:0;
    if(!Number.isFinite(threshold)||threshold<0)throw new EngineContractError("INVALID_INPUT","Invalid threshold");
    if(candidate[metric]<baseline[metric]-threshold)regressions.push(metric);
  }
  return {regressions,reviewRequired:true,independentlyValidated:false,changesApplied:false};
}
