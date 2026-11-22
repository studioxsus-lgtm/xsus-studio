import {validateBuildManifest} from "../build/build-manifest.js";
import {createSandboxPolicy} from "./sandbox-policy.js";
export const SANDBOX_RUNNER_VERSION="0.1.0";
export function createSandboxRunner({provider,policy={}}={}){
  if(!provider || typeof provider!=="object" || typeof provider.execute!=="function")throw new TypeError("An isolated sandbox provider is required");
  const limits=createSandboxPolicy(policy);
  return Object.freeze({
    policy:limits,
    async run(input,{signal}={}){
      if(signal?.aborted)throw new Error("Sandbox cancelled");
      const manifest=validateBuildManifest(input);
      const response=await provider.execute({manifest,policy:limits,signal});
      if(signal?.aborted)throw new Error("Sandbox cancelled");
      if(!response || typeof response!=="object" || typeof response.success!=="boolean" || !Array.isArray(response.diagnostics))throw new TypeError("Invalid sandbox provider response");
      if(response.diagnostics.length>100)throw new RangeError("Too many sandbox diagnostics");
      const diagnostics=response.diagnostics.map(item=>{
        if(!item || typeof item!=="object" || !["info","warning","error"].includes(item.level) || typeof item.message!=="string" || item.message.length>2000)throw new TypeError("Invalid sandbox diagnostic");
        return Object.freeze({level:item.level,message:item.message});
      });
      return Object.freeze({version:SANDBOX_RUNNER_VERSION,success:response.success,diagnostics:Object.freeze(diagnostics),project:manifest.project,policy:limits,verifiedIsolation:false});
    }
  });
}
