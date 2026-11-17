import {request,result,EngineContractError} from "../contracts.js";
export const ENGINE_ID="multi-agent";
export function dispatchAgents(input) {
  const req=request(input,ENGINE_ID,"agents.dispatch");
  if(req.payload.delegateAuthorization !== undefined) throw new EngineContractError("UNSAFE_PAYLOAD","Unverified delegation is forbidden");
  return result(req,{state:"blocked",reason:"Agent registry and delegation policy not configured",dispatched:0},"rejected");
}

export function planAgentAssignments(input) {
  const req=request(input,ENGINE_ID,"agents.planAssignments");
  const {agents,tasks}=req.payload;
  if(!Array.isArray(agents)||!Array.isArray(tasks)||agents.length>50||tasks.length>100)throw new EngineContractError("INVALID_INPUT","Invalid agents or tasks");
  const ids=new Set();
  for(const agent of agents){
    if(!agent||typeof agent!=="object"||Array.isArray(agent))throw new EngineContractError("INVALID_INPUT","Invalid agent");
    const id=String(agent.id??"");if(!id.trim()||ids.has(id))throw new EngineContractError("INVALID_INPUT","Duplicate or missing agent ID");
    ids.add(id);
  }
  const assignments=tasks.map(task=>{
    if(!task||typeof task!=="object"||Array.isArray(task))throw new EngineContractError("INVALID_INPUT","Invalid task");
    const id=String(task.id??"");if(!id.trim())throw new EngineContractError("INVALID_INPUT","Missing task ID");
    const agentId=String(task.agentId??"");
    return {taskId:id,agentId:ids.has(agentId)?agentId:null,state:"unapproved"};
  });
  return result(req,{assignments,unassignedCount:assignments.filter(x=>x.agentId===null).length,dispatched:0,delegationAuthorized:false});
}
