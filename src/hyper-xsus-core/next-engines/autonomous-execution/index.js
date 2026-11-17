import {request,result,EngineContractError} from "../contracts.js";
export const ENGINE_ID="autonomous-execution";
export function prepareExecution(input) {
  const req=request(input,ENGINE_ID,"execution.prepare");
  if(req.payload.command !== undefined || req.payload.script !== undefined) throw new EngineContractError("UNSAFE_PAYLOAD","Raw commands are not accepted");
  return result(req,{state:"blocked",reason:"Sandbox and approval gate not configured",sideEffects:false},"rejected");
}

export function evaluateExecutionReadiness(input) {
  const req=request(input,ENGINE_ID,"execution.evaluateReadiness");
  const payload=req.payload;
  if(payload.command!==undefined||payload.script!==undefined)throw new EngineContractError("UNSAFE_PAYLOAD","Raw commands are forbidden");
  const checks=["sandboxVerified","approvalVerified","policyVerified","recoveryVerified","idempotencyVerified"];
  const missing=checks.filter(key=>payload[key]!==true);
  // Caller-supplied flags are not trustworthy proof of authorization.
  return result(req,{state:"blocked",claimedChecksPresent:missing.length===0,missingClaimedChecks:missing,verifiedByTrustedRuntime:false,sideEffects:false},"rejected");
}
