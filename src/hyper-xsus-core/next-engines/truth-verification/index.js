import {request,result,string,EngineContractError,object} from "../contracts.js";
export const ENGINE_ID="truth-verification";
export function verifyClaim(input) {
  const req=request(input,ENGINE_ID,"truth.verifyClaim");
  string(req.payload.claim,"claim");
  const evidence=req.payload.evidence;
  if (!Array.isArray(evidence) || evidence.length>100) throw new EngineContractError("INVALID_INPUT","evidence must be an array of at most 100 items");
  const seen=new Set();
  let supporting=0,opposing=0,unassessed=0;
  for(const item of evidence) {
    object(item,"evidence item");
    const id=string(item.id,"evidence.id");
    if(seen.has(id)) throw new EngineContractError("DUPLICATE_EVIDENCE","Duplicate evidence identifier");
    seen.add(id);
    if(item.stance !== undefined && !["supports","opposes","unknown"].includes(item.stance)) throw new EngineContractError("INVALID_INPUT","Invalid evidence stance");
    if(item.stance==="supports") supporting++;
    else if(item.stance==="opposes") opposing++;
    else unassessed++;
  }
  // Stances describe supplied evidence; they do not establish verified truth.
  return result(req,{verdict:"insufficient_evidence",evidenceCount:evidence.length,independentlyVerified:false,assessment:{supporting,opposing,unassessed,conflictingStances:supporting>0&&opposing>0}});
}
