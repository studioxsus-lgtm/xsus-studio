import {assertIntelligenceAdapter} from "./contracts.js";
export const INTELLIGENCE_PLAN_VERSION="1.0.0";
const ALLOWED_ACTIONS=new Set(["design","generate","test","review","build"]);
function validatePlan(raw) {
  if (!raw || typeof raw!=="object" || Array.isArray(raw)) throw new TypeError("Intelligence plan must be an object");
  if (!Array.isArray(raw.tasks) || raw.tasks.length===0 || raw.tasks.length>100) throw new TypeError("Intelligence plan requires 1-100 tasks");
  const ids=new Set();
  const tasks=raw.tasks.map((task,index)=>{
    if (!task || typeof task!=="object" || Array.isArray(task)) throw new TypeError(`Invalid task at ${index}`);
    if (typeof task.id!=="string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(task.id) || ids.has(task.id)) throw new TypeError("Task IDs must be unique and safe");
    if (!ALLOWED_ACTIONS.has(task.action)) throw new TypeError("Unsupported task action");
    if (typeof task.description!=="string" || !task.description.trim() || task.description.length>2000) throw new TypeError("Invalid task description");
    if (!Array.isArray(task.dependsOn) || !task.dependsOn.every(id=>typeof id==="string")) throw new TypeError("Invalid task dependencies");
    ids.add(task.id);
    return Object.freeze({id:task.id,action:task.action,description:task.description.trim(),dependsOn:Object.freeze([...task.dependsOn])});
  });
  for (const task of tasks) for (const dependency of task.dependsOn) {
    if (!ids.has(dependency) || dependency===task.id) throw new TypeError("Unknown or self-referential task dependency");
  }
  const visited=new Set(),visiting=new Set(),byId=new Map(tasks.map(task=>[task.id,task]));
  function visit(id) {
    if (visiting.has(id)) throw new TypeError("Cyclic task dependency");
    if (visited.has(id)) return;
    visiting.add(id);
    for(const dependency of byId.get(id).dependsOn) visit(dependency);
    visiting.delete(id);visited.add(id);
  }
  for(const task of tasks) visit(task.id);
  return Object.freeze({version:INTELLIGENCE_PLAN_VERSION,tasks:Object.freeze(tasks)});
}
export function createHyperIntelligenceAdapter({engine}={}) {
  if (!engine || typeof engine.plan!=="function") throw new TypeError("Hyper XSUS engine must implement plan");
  return assertIntelligenceAdapter(Object.freeze({
    async analyze(input,{signal}={}) {
      if (!input || typeof input.prompt!=="string" || !input.prompt.trim()) throw new TypeError("Valid normalized input required");
      if (signal?.aborted) throw new Error("Intelligence planning cancelled");
      const raw=await engine.plan({prompt:input.prompt,specification:input.specification??null},{signal});
      if (signal?.aborted) throw new Error("Intelligence planning cancelled");
      return validatePlan(raw);
    }
  }));
}
