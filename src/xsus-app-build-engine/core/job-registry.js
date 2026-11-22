import {createBuildJob} from "./kernel.js";
import {transitionJob} from "./state-machine.js";
export function createJobRegistry() {
  const jobs=new Map();
  return Object.freeze({
    create(request,{id}={}) {
      if (jobs.has(id)) throw new Error("Duplicate job ID");
      const job=createBuildJob(request,{id});
      jobs.set(id,job);
      return job;
    },
    get(id) {return jobs.get(id) ?? null;},
    transition(id,state) {
      const current=jobs.get(id);
      if (!current) throw new Error("Unknown job ID");
      const next=transitionJob(current,state);
      jobs.set(id,next);
      return next;
    },
    count() {return jobs.size;}
  });
}
