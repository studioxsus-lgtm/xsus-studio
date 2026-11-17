import {request,result,EngineContractError} from "../contracts.js";
export const ENGINE_ID="autonomous-execution";
export function prepareExecution(input) {
  const req=request(input,ENGINE_ID,"execution.prepare");
  if(req.payload.command !== undefined || req.payload.script !== undefined) throw new EngineContractError("UNSAFE_PAYLOAD","Raw commands are not accepted");
  return result(req,{state:"blocked",reason:"Sandbox and approval gate not configured",sideEffects:false},"rejected");
}
