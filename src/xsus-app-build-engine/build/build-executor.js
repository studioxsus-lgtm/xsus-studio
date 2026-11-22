import {validateBuildManifest} from "./build-manifest.js";
export const BUILD_EXECUTOR_VERSION="0.1.0";
export function createBuildExecutor({runner}={}) {
  if(typeof runner!=="function") throw new TypeError("Trusted isolated runner must be injected");
  return Object.freeze({
    async execute(input,{signal}={}) {
      if(signal?.aborted) throw new Error("Build cancelled");
      const manifest=validateBuildManifest(input);
      const result=await runner(manifest,{signal});
      if(signal?.aborted) throw new Error("Build cancelled");
      if(!result || typeof result!=="object" || typeof result.success!=="boolean" || !Array.isArray(result.diagnostics)) throw new TypeError("Invalid runner result");
      const diagnostics=result.diagnostics.map(item=>{
        if(!item || typeof item!=="object" || !["info","warning","error"].includes(item.level) || typeof item.message!=="string" || item.message.length>2000) throw new TypeError("Invalid build diagnostic");
        return Object.freeze({level:item.level,message:item.message});
      });
      if(diagnostics.length>100) throw new RangeError("Too many build diagnostics");
      return Object.freeze({version:BUILD_EXECUTOR_VERSION,success:result.success,diagnostics:Object.freeze(diagnostics),project:manifest.project});
    }
  });
}
