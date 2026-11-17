import {request,result} from "../contracts.js";
export const ENGINE_ID="autonomous-execution";
export function prepareExecution(input) {
  const req=request(input,ENGINE_ID,"execution.prepare");
  return result(req,{state:"blocked",reason:"Sandbox and approval gate not configured",sideEffects:false},"rejected");
}
