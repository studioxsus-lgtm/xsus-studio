export const NEXT_ENGINES_CONTRACT_VERSION = "1.0.0";
export class EngineContractError extends Error {
  constructor(code, message) { super(message); this.name = "EngineContractError"; this.code = code; }
}
export function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new EngineContractError("INVALID_INPUT", name + " must be an object");
  return value;
}
export function string(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new EngineContractError("INVALID_INPUT", name + " must be non-empty");
  return value;
}
export function request(value, engine, operation) {
  object(value, "request");
  if (value.contractVersion !== NEXT_ENGINES_CONTRACT_VERSION) throw new EngineContractError("UNSUPPORTED_VERSION", "Unsupported contract version");
  string(value.requestId, "requestId");
  if (value.engineId !== engine) throw new EngineContractError("ENGINE_MISMATCH", "Engine mismatch");
  if (value.operation !== operation) throw new EngineContractError("UNSUPPORTED_OPERATION", "Unsupported operation");
  object(value.payload, "payload");
  object(value.context, "context");
  string(value.context.traceId, "traceId");
  string(value.context.principalId, "principalId");
  string(value.context.authorizationRef, "authorizationRef");
  return value;
}
export function result(req, data, status = "success") {
  return {contractVersion:NEXT_ENGINES_CONTRACT_VERSION,requestId:req.requestId,engineId:req.engineId,status,result:data,metadata:{traceId:req.context.traceId}};
}
