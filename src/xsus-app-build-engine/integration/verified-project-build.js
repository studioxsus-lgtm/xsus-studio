import {createProjectGenerationIntegration} from "./project-generation-integration.js";
import {verifyStaticBuild} from "./build-verification-gate.js";
export const VERIFIED_PROJECT_BUILD_VERSION="0.1.0";
/**
 * Verifies the generated manifest immediately before invoking the trusted
 * runtime. This is a structural preflight, not proof of a physical build.
 */
export function createVerifiedProjectBuild({planner,authorize,runtime,recordResult}={}){
 if(!runtime||typeof runtime.execute!=="function")throw new TypeError("Trusted build runtime required");
 const verifiedRuntime=Object.freeze({
  async execute(input){
   verifyStaticBuild(input.manifest);
   return runtime.execute(input);
  }
 });
 return createProjectGenerationIntegration({planner,authorize,runtime:verifiedRuntime,recordResult});
}
