import {EngineContractError,object,string} from "../contracts.js";
export function inspectDelegationGraph(edges) {
  if(!Array.isArray(edges)||edges.length>100)throw new EngineContractError("INVALID_INPUT","Invalid edges");
  const graph=new Map();
  for(const edge of edges){
    object(edge,"edge");const from=string(edge.from,"from"),to=string(edge.to,"to");
    if(from===to)throw new EngineContractError("CYCLIC_DELEGATION","Self delegation");
    if(!graph.has(from))graph.set(from,new Set());
    if(graph.get(from).has(to))throw new EngineContractError("DUPLICATE_DELEGATION","Duplicate edge");
    graph.get(from).add(to);
  }
  const active=new Set(),done=new Set();
  function visit(id){if(active.has(id))throw new EngineContractError("CYCLIC_DELEGATION","Delegation cycle");if(done.has(id))return;active.add(id);for(const child of graph.get(id)??[])visit(child);active.delete(id);done.add(id);}
  for(const id of graph.keys())visit(id);
  return {edgeCount:edges.length,acyclic:true,delegationAuthorized:false,dispatched:0};
}
