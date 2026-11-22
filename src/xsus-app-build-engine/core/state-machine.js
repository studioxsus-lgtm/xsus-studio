export const JOB_TRANSITIONS = Object.freeze({
  created: Object.freeze(["validated","failed"]),
  validated: Object.freeze(["planned","failed"]),
  planned: Object.freeze(["generating","failed"]),
  generating: Object.freeze(["testing","failed"]),
  testing: Object.freeze(["ready","failed"]),
  ready: Object.freeze([]),
  failed: Object.freeze([])
});
export function transitionJob(job,nextState) {
  if (!job || typeof job !== "object" || !Object.hasOwn(JOB_TRANSITIONS,job.state)) throw new TypeError("Unknown job state");
  if (!JOB_TRANSITIONS[job.state].includes(nextState)) throw new Error(`Invalid job transition: ${job.state} -> ${nextState}`);
  return Object.freeze({...job,state:nextState});
}
