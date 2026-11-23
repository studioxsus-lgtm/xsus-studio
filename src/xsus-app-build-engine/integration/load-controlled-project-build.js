import {createSecureVerifiedProjectBuild} from "./secure-verified-project-build.js";
import {createBuildConcurrencyLimiter} from "./build-concurrency-limiter.js";
export const LOAD_CONTROLLED_PROJECT_BUILD_VERSION="0.1.0";
/** Admission is process-local and covers the full build/receipt lifecycle. */
export function createLoadControlledProjectBuild({planner,authorize,runtime,recordResult,maxActive=2,maxQueued=16}={}){
 const engine=createSecureVerifiedProjectBuild({planner,authorize,runtime,recordResult});
 const limiter=createBuildConcurrencyLimiter({maxActive,maxQueued});
 return Object.freeze({
  build(request){return limiter.run(()=>engine.build(request),{signal:request?.signal});},
  snapshot:limiter.snapshot
 });
}
