import {validateBuildManifest} from "../build/build-manifest.js";
export const SANDBOX_VERIFICATION_VERSION="0.1.0";
export function createSandboxVerification({runner}={}){
  if(!runner||typeof runner.run!=="function")throw new TypeError("Sandbox runner required");
  return Object.freeze({
    async inspect(prepared,{signal}={}){
      if(!prepared||prepared.status!=="review-required"||prepared.productionApproved!==false)throw new TypeError("Untrusted prepared build");
      const manifest=validateBuildManifest(prepared.manifest);
      if(prepared.project!==manifest.project||prepared.architecture?.slug!==manifest.project)throw new TypeError("Project identity mismatch");
      if(signal?.aborted)throw new Error("Sandbox verification cancelled");
      const result=await runner.run(manifest,{signal});
      if(signal?.aborted)throw new Error("Sandbox verification cancelled");
      if(!result||result.project!==manifest.project||typeof result.success!=="boolean"||result.verifiedIsolation!==true) {
        return Object.freeze({version:SANDBOX_VERIFICATION_VERSION,project:manifest.project,passed:false,blockers:Object.freeze(["isolation-unverified"]),productionApproved:false,requiresHumanReview:true});
      }
      const passed=result.success===true&&Array.isArray(result.diagnostics)&&!result.diagnostics.some(d=>d.level==="error");
      return Object.freeze({version:SANDBOX_VERIFICATION_VERSION,project:manifest.project,passed,blockers:Object.freeze(passed?[]:["sandbox-execution"]),productionApproved:false,requiresHumanReview:true});
    }
  });
}
