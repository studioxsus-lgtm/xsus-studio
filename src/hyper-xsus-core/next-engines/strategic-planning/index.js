import {request,result,string,EngineContractError,object} from "../contracts.js";
export const ENGINE_ID="strategic-planning";
export function createPlan(input) {
  const req=request(input,ENGINE_ID,"planning.create");
  const goal=string(req.payload.goal,"goal");
  if(goal.length>4096) throw new EngineContractError("INPUT_TOO_LARGE","Goal exceeds limit");
  const raw=req.payload.steps??[];
  if(!Array.isArray(raw)||raw.length>100) throw new EngineContractError("INVALID_INPUT","steps must be an array of at most 100");
  const ids=new Set();
  const steps=raw.map((step)=>{
    object(step,"step");
    const id=string(step.id,"step.id");
    const task=string(step.task,"step.task");
    if(ids.has(id)) throw new EngineContractError("DUPLICATE_STEP","Duplicate step identifier");
    ids.add(id);
    if(!Array.isArray(step.dependsOn)||step.dependsOn.some(x=>typeof x!=="string"||!x.trim())) throw new EngineContractError("INVALID_INPUT","dependsOn must be a string array");
    return {id,task,dependsOn:[...step.dependsOn]};
  });
  for(const step of steps) for(const dep of step.dependsOn) if(!ids.has(dep)) throw new EngineContractError("UNKNOWN_DEPENDENCY","Missing step dependency");
  const visiting=new Set(),visited=new Set(),byId=new Map(steps.map(x=>[x.id,x]));
  function visit(id){if(visiting.has(id)) throw new EngineContractError("CYCLIC_DEPENDENCY","Plan contains a dependency cycle");if(visited.has(id)) return;visiting.add(id);for(const dep of byId.get(id).dependsOn) visit(dep);visiting.delete(id);visited.add(id);}
  for(const id of ids) visit(id);
  return result(req,{goal,steps,state:"draft",executable:false,dependencyGraphValid:true});
}

export function schedulePlan(input) {
  const req=request(input,ENGINE_ID,"planning.schedule");
  const steps=req.payload.steps;
  if(!Array.isArray(steps)||steps.length>100)throw new EngineContractError("INVALID_INPUT","Invalid steps");
  const nodes=new Map();
  for(const step of steps){
    object(step,"step");const id=string(step.id,"step.id");
    if(nodes.has(id))throw new EngineContractError("DUPLICATE_STEP","Duplicate step");
    if(!Array.isArray(step.dependsOn)||step.dependsOn.some(x=>typeof x!=="string"||!x.trim()))throw new EngineContractError("INVALID_INPUT","Invalid dependencies");
    nodes.set(id,{id,dependsOn:[...step.dependsOn]});
  }
  const state=new Map(),order=[];
  function visit(id){
    if(!nodes.has(id))throw new EngineContractError("UNKNOWN_DEPENDENCY","Unknown dependency");
    if(state.get(id)===1)throw new EngineContractError("CYCLIC_DEPENDENCY","Cycle");
    if(state.get(id)===2)return;
    state.set(id,1);for(const dep of nodes.get(id).dependsOn)visit(dep);
    state.set(id,2);order.push(id);
  }
  for(const id of nodes.keys())visit(id);
  return result(req,{orderedStepIds:order,dependencyGraphValid:true,executable:false});
}
