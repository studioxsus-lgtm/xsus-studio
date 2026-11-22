// Optional adapter boundary: Hyper and Future cores remain independent.
// The XSUS App builder does not import, merge, execute, or mutate either core.
const clean=value=>typeof value==='string'&&value.length>0&&value.length<=1200&&
 !/[\u0000-\u001f\u007f]/.test(value);
export function normalizeXsUsCorePlan(input) {
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 if(input.contractVersion!=='1.0.0'||!clean(input.goal))return null;
 const steps=input.steps;
 if(!Array.isArray(steps)||steps.length>32||
    !steps.every(step=>typeof step==='string'&&step.length>0&&step.length<=240&&
      !/[\u0000-\u001f\u007f]/.test(step)))return null;
 return Object.freeze({contractVersion:'1.0.0',goal:input.goal,
  steps:Object.freeze([...steps]),status:'planning-only',executable:false});
}
export function createXsUsCorePlanningAdapters({hyper,future}={}) {
 return Object.freeze({
  async plan(goal){
   if(!clean(goal))return null;
   // No implicit calls to external demos or models; explicit injected adapters only.
   if(typeof future?.normalizeGoal!=='function'||typeof hyper?.planApplication!=='function')
    return null;
   const normalized=await future.normalizeGoal({goal});
   if(!normalized||!clean(normalized.goal))return null;
   const proposed=await hyper.planApplication({goal:normalized.goal});
   return normalizeXsUsCorePlan(proposed);
  }
 });
}
