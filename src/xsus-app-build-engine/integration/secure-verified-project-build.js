import {createVerifiedProjectBuild} from "./verified-project-build.js";
import {enforceBuildSecurity} from "./build-security-gate.js";
export const SECURE_VERIFIED_PROJECT_BUILD_VERSION="0.1.0";
/** Backend-only guard around the verified build pipeline. */
export function createSecureVerifiedProjectBuild({planner,authorize,runtime,recordResult}={}){
 if(!runtime||typeof runtime.execute!=="function")throw new TypeError("Trusted isolated runtime required");
 const securedRuntime=Object.freeze({
  async execute(input){
   const checked=enforceBuildSecurity({manifest:input.manifest,policy:input.policy});
   return runtime.execute({...input,manifest:checked.manifest,policy:checked.policy});
  }
 });
 return createVerifiedProjectBuild({planner,authorize,runtime:securedRuntime,recordResult});
}
