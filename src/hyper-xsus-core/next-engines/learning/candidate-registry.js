import {EngineContractError,object,string} from "../contracts.js";
export function reviewCandidates(candidates) {
  if(!Array.isArray(candidates)||candidates.length>100)throw new EngineContractError("INVALID_INPUT","Invalid candidates");
  const seen=new Set();
  return candidates.map(item=>{
    object(item,"candidate");const id=string(item.id,"candidate.id");const sourceRef=string(item.sourceRef,"sourceRef");
    if(seen.has(id))throw new EngineContractError("DUPLICATE_CANDIDATE","Duplicate candidate");
    seen.add(id);
    return {id,sourceRef,state:"pending_verification",committed:false};
  });
}
