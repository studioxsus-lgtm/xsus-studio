import {createBuildJob} from "./kernel.js";
export function createOrchestrator({planner,languageAdapter,intelligenceAdapter}={}) {
  if (typeof planner!=="function") throw new TypeError("planner adapter is required");
  return Object.freeze({
    async plan(request,{id,signal}={}) {
      if (signal?.aborted) throw new Error("Build cancelled");
      const job=createBuildJob(request,{id});
      const language=languageAdapter ? await languageAdapter.normalize(job.input,{signal}) : job.input;
      if (signal?.aborted) throw new Error("Build cancelled");
      const intelligence=intelligenceAdapter ? await intelligenceAdapter.analyze(language,{signal}) : null;
      const plan=await planner({job,language,intelligence,signal});
      if (!plan || typeof plan!=="object" || Array.isArray(plan)) throw new TypeError("Planner must return an object");
      return Object.freeze({...job,state:"planned",plan:Object.freeze({...plan})});
    }
  });
}
