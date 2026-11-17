import {EngineContractError,object,string} from "../contracts.js";
export function auditProvenance(records) {
  if(!Array.isArray(records)||records.length>100)throw new EngineContractError("INVALID_INPUT","Invalid records");
  const ids=new Set(),sources=new Map();
  for(const record of records){
    object(record,"record");
    const id=string(record.id,"id"),source=string(record.sourceRef,"sourceRef");
    if(ids.has(id))throw new EngineContractError("DUPLICATE_EVIDENCE","Duplicate record");
    ids.add(id);sources.set(source,(sources.get(source)??0)+1);
  }
  return {recordCount:ids.size,distinctSourceCount:sources.size,sourceReuse:[...sources].filter(([,count])=>count>1).map(([sourceRef,count])=>({sourceRef,count})),independentlyVerified:false};
}
