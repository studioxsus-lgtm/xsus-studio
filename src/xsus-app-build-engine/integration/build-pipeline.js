import {createOrchestrator} from "../core/orchestrator.js";
import {createProjectArchitecture} from "../architecture/project-architect.js";
import {generateStaticApp} from "../generator/code-generator.js";
import {validateBuildManifest} from "../build/build-manifest.js";
import {inspectReleaseSecurity} from "../security/release-security-gate.js";
export const BUILD_PIPELINE_VERSION="0.1.0";
const SLUG=/^[a-z][a-z0-9-]{1,47}$/;
function defaultPlanner({job,language,intelligence}){
  const slug=job.input.projectId;
  if(typeof slug!=="string"||!SLUG.test(slug))throw new TypeError("Valid project slug required");
  const name=language.specification?.intent||slug;
  const architecture=createProjectArchitecture({name:name.slice(0,100),slug,modules:[{id:"home",kind:"page"}],routes:[{id:"home",path:"/",moduleId:"home"}]});
  return {architecture,taskCount:intelligence?.tasks?.length??0};
}
export function createBuildPipeline({languageAdapter,intelligenceAdapter,planner=defaultPlanner}={}){
  const orchestrator=createOrchestrator({planner,languageAdapter,intelligenceAdapter});
  return Object.freeze({
    async prepare(request,{id,signal}={}){
      if(signal?.aborted)throw new Error("Build cancelled");
      const job=await orchestrator.plan(request,{id,signal});
      if(signal?.aborted)throw new Error("Build cancelled");
      const architecture=createProjectArchitecture(job.plan.architecture);
      if(architecture.slug!==job.input.projectId)throw new TypeError("Architecture project mismatch");
      const generated=generateStaticApp(architecture);
      const manifest=validateBuildManifest(generated);
      const security=inspectReleaseSecurity(manifest);
      return Object.freeze({version:BUILD_PIPELINE_VERSION,jobId:job.id,project:manifest.project,architecture,manifest,security,status:"review-required",productionApproved:false,requiresHumanReview:true});
    }
  });
}
