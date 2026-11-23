import {createLoadControlledProjectBuild} from "./load-controlled-project-build.js";
export const FULL_SYSTEM_BUILD_INTEGRATION_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
/**
 * Composes phases 63–67 behind one backend-facing entry point.
 * Prevents concurrent reuse of an execution identity in this process.
 * This is NOT a distributed idempotency or durable fencing mechanism.
 */
export function createFullSystemBuildIntegration(options={}){
 const engine=createLoadControlledProjectBuild(options);
 const inFlight=new Set();
 return Object.freeze({
  async build(request){
   if(!request||typeof request!=="object"||typeof request.executionId!=="string"||!ID.test(request.executionId)||typeof request.operationId!=="string"||!ID.test(request.operationId))throw new TypeError("Invalid full-system execution identity");
   const key=request.executionId+":"+request.operationId;
   if(inFlight.has(key))throw new Error("Build operation already in progress");
   inFlight.add(key);
   try{return await engine.build(request);}
   finally{inFlight.delete(key);}
  },
  snapshot(){return Object.freeze({...engine.snapshot(),inFlight:inFlight.size});}
 });
}
