export const BUILD_ENGINE_VERSION = "0.1.0";
export const BUILD_STATES = Object.freeze(["created","validated","planned","generating","testing","ready","failed"]);
export function validateBuildRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) throw new TypeError("Build request must be an object");
  if (typeof request.prompt !== "string" || !request.prompt.trim()) throw new TypeError("Build prompt must be a non-empty string");
  if (request.prompt.length > 20000) throw new RangeError("Build prompt exceeds 20000 characters");
  return Object.freeze({prompt:request.prompt.trim(),projectId:typeof request.projectId==="string" ? request.projectId : null});
}
export function createBuildJob(request, {id}={}) {
  const input=validateBuildRequest(request);
  if (typeof id!=="string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(id)) throw new TypeError("A valid externally generated job ID is required");
  return Object.freeze({id,version:BUILD_ENGINE_VERSION,state:"created",input});
}
