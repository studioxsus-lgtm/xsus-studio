import {EngineContractError,object,string} from "../contracts.js";
export function analyzeCriticalPath(steps) {
  if(!Array.isArray(steps)||steps.length>100)throw new EngineContractError("INVALID_INPUT","Invalid steps");
  const map=new Map();
  for(const step of steps){
    object(step,"step");const id=string(step.id,"id");
    if(map.has(id))throw new EngineContractError("DUPLICATE_STEP","Duplicate step");
    if(!Number.isSafeInteger(step.duration)||step.duration<0||step.duration>1000000)throw new EngineContractError("INVALID_INPUT","Invalid duration");
    if(!Array.isArray(step.dependsOn))throw new EngineContractError("INVALID_INPUT","Invalid dependencies");
    map.set(id,step);
  }
  const active=new Set(),memo=new Map();
  function finish(id){
    if(!map.has(id))throw new EngineContractError("UNKNOWN_DEPENDENCY","Missing dependency");
    if(active.has(id))throw new EngineContractError("CYCLIC_DEPENDENCY","Cycle");
    if(memo.has(id))return memo.get(id);
    active.add(id);const step=map.get(id);let start=0;
    for(const dep of step.dependsOn){string(dep,"dependency");start=Math.max(start,finish(dep));}
    active.delete(id);const end=start+step.duration;memo.set(id,end);return end;
  }
  for(const id of map.keys())finish(id);
  return {minimumEstimatedDuration:Math.max(0,...memo.values()),earliestFinish:Object.fromEntries(memo),executable:false};
}
