import {request,result,string,EngineContractError,object} from "../contracts.js";
export const ENGINE_ID="strategic-planning";
export function createPlan(input) {
  const req=request(input,ENGINE_ID,"planning.create");
  const goal=string(req.payload.goal,"goal");
  if(goal.length>4096) throw new EngineContractError("INPUT_TOO_LARGE","Goal exceeds limit");
  const raw=req.payload.steps??[];
  if(!Array.isArray(raw)||raw.length>100) throw new EngineContractError("INVALID_INPUT","steps must be an array of at most 100");
  const ids=new Set();
  const steps=raw.map((step)=>{
    object(step,"step");
    const id=string(step.id,"step.id");
    const task=string(step.task,"step.task");
    if(ids.has(id)) throw new EngineContractError("DUPLICATE_STEP","Duplicate step identifier");
    ids.add(id);
    if(!Array.isArray(step.dependsOn)||step.dependsOn.some(x=>typeof x!=="string"||!x.trim())) throw new EngineContractError("INVALID_INPUT","dependsOn must be a string array");
    return {id,task,dependsOn:[...step.dependsOn]};
  });
  for(const step of steps) for(const dep of step.dependsOn) if(!ids.has(dep)) throw new EngineContractError("UNKNOWN_DEPENDENCY","Missing step dependency");
  const visiting=new Set(),visited=new Set(),byId=new Map(steps.map(x=>[x.id,x]));
  function visit(id){if(visiting.has(id)) throw new EngineContractError("CYCLIC_DEPENDENCY","Plan contains a dependency cycle");if(visited.has(id)) return;visiting.add(id);for(const dep of byId.get(id).dependsOn) visit(dep);visiting.delete(id);visited.add(id);}
  for(const id of ids) visit(id);
  return result(req,{goal,steps,state:"draft",executable:false,dependencyGraphValid:true});
}

export function schedulePlan(input) {
  const req=request(input,ENGINE_ID,"planning.schedule");
  const steps=req.payload.steps;
  if(!Array.isArray(steps)||steps.length>100)throw new EngineContractError("INVALID_INPUT","Invalid steps");
  const nodes=new Map();
  for(const step of steps){
    object(step,"step");const id=string(step.id,"step.id");
    if(nodes.has(id))throw new EngineContractError("DUPLICATE_STEP","Duplicate step");
    if(!Array.isArray(step.dependsOn)||step.dependsOn.some(x=>typeof x!=="string"||!x.trim()))throw new EngineContractError("INVALID_INPUT","Invalid dependencies");
    nodes.set(id,{id,dependsOn:[...step.dependsOn]});
  }
  const state=new Map(),order=[];
  function visit(id){
    if(!nodes.has(id))throw new EngineContractError("UNKNOWN_DEPENDENCY","Unknown dependency");
    if(state.get(id)===1)throw new EngineContractError("CYCLIC_DEPENDENCY","Cycle");
    if(state.get(id)===2)return;
    state.set(id,1);for(const dep of nodes.get(id).dependsOn)visit(dep);
    state.set(id,2);order.push(id);
  }
  for(const id of nodes.keys())visit(id);
  return result(req,{orderedStepIds:order,dependencyGraphValid:true,executable:false});
}

/**
 * Deterministic, review-only planning for supported application categories.
 * Unlike createPlan, this derives steps from the goal rather than requiring
 * the browser to supply them. It does not execute or generate code.
 */
export function proposeApplicationPlan(goal) {
  const value=string(goal,"goal").trim();
  if(value.length>4096)throw new EngineContractError("INPUT_TOO_LARGE","Goal exceeds limit");
  const normalized=value.toLowerCase();
  const isTasks=/\\b(task|tasks|todo|to-do|project management|kanban)\\b/.test(normalized);
  const isBooking=/\\b(book|booking|reservation|appointment|calendar)\\b/.test(normalized);
  const isStore=/\\b(store|shop|e-commerce|ecommerce|checkout|cart)\\b/.test(normalized);
  const category=isTasks?"task-management":isBooking?"booking":isStore?"commerce":"general";
  const features={
    "task-management":["Define task, project, and user roles and acceptance criteria.","Model projects, tasks, assignments, statuses, and progress.","Design authentication and project-level access rules.","Build the dashboard, project list, and task editing interfaces.","Implement task lifecycle, filtering, and progress tracking."],
    booking:["Define booking actors, resources, and acceptance criteria.","Model availability, bookings, and customer records.","Design authentication and booking authorization.","Build calendar, availability search, and booking screens.","Implement booking creation, cancellation, and conflict checks."],
    commerce:["Define catalog, order, and checkout requirements.","Model products, carts, orders, and customer records.","Design authentication and order access rules.","Build product catalog, cart, and checkout screens.","Implement cart updates and server-side order validation."],
    general:["Define the application requirements and acceptance criteria.","Design data entities, relationships, and storage boundaries.","Design authentication, permissions, and security constraints.","Build the core navigation and application screens.","Implement the primary user workflows and validation."]
  };
  const tasks=[...features[category],
    "Add accessibility, responsive layouts, and error handling.",
    "Test security, business workflows, and failure cases.",
    "Review and approve the plan before any code generation or deployment."];
  return Object.freeze({category,source:"hyper-xsus-core/deterministic-planner",requiresHumanReview:true,
    steps:tasks.map((task,i)=>({id:`step-${i+1}`,task,dependsOn:i?[`step-${i}`]:[]}))});
}
