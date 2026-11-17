import {request,result,EngineContractError} from "../contracts.js";
export const ENGINE_ID="multi-agent";
export function dispatchAgents(input) {
  const req=request(input,ENGINE_ID,"agents.dispatch");
  if(req.payload.delegateAuthorization !== undefined) throw new EngineContractError("UNSAFE_PAYLOAD","Unverified delegation is forbidden");
  return result(req,{state:"blocked",reason:"Agent registry and delegation policy not configured",dispatched:0},"rejected");
}
