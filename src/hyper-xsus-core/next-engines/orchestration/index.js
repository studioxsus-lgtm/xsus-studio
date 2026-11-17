import {request,result,object,EngineContractError} from "../contracts.js";
import {verifyClaim} from "../truth-verification/index.js";
import {proposeLearning} from "../learning/index.js";
import {createPlan} from "../strategic-planning/index.js";
import {evaluateExecutionReadiness} from "../autonomous-execution/index.js";
import {analyzeImprovement} from "../self-improvement/index.js";
import {dispatchAgents} from "../multi-agent/index.js";
export const ENGINE_ID="six-engine-orchestration";
const MAX_STAGES=6;
const stages=[
  ["truth", "truth-verification", "truth.verifyClaim", verifyClaim],
  ["learning", "learning", "learning.propose", proposeLearning],
  ["planning", "strategic-planning", "planning.create", createPlan],
  ["execution", "autonomous-execution", "execution.evaluateReadiness", evaluateExecutionReadiness],
  ["improvement", "self-improvement", "improvement.analyze", analyzeImprovement],
  ["agents", "multi-agent", "agents.dispatch", dispatchAgents]
];
export function coordinateSixEngines(input) {
  const req=request(input,ENGINE_ID,"orchestration.coordinate");
  const inputs=object(req.payload.inputs,"inputs");
  const supplied=Object.keys(inputs);
  if(supplied.some(key=>!stages.some(([name])=>name===key)))throw new EngineContractError("INVALID_INPUT","Unknown engine input");
  const outcomes=[];
  for(const [name,engineId,operation,handler] of stages){
    if(!Object.hasOwn(inputs,name))continue;
    const payload=object(inputs[name],name);
    const child={contractVersion:req.contractVersion,requestId:req.requestId,engineId,operation,payload,context:req.context};
    try {
      const response=handler(child);
      outcomes.push({stage:name,engineId,status:response.status,result:response.result});
    } catch(error) {
      if(!(error instanceof EngineContractError))throw error;
      outcomes.push({stage:name,engineId,status:"rejected",errorCode:error.code});
    }
  }
  if(outcomes.length>MAX_STAGES)throw new EngineContractError("INVALID_INPUT","Too many stages");
  const rejected=outcomes.filter(x=>x.status==="rejected").length;
  return result(req,{state:"review_required",stages:outcomes,completed:outcomes.length,rejected,authorizedForExecution:false,sideEffects:false});
}
