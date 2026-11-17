import {request,result,string} from "../contracts.js";
export const ENGINE_ID="strategic-planning";
export function createPlan(input) {
  const req=request(input,ENGINE_ID,"planning.create");
  string(req.payload.goal,"goal");
  return result(req,{goal:req.payload.goal,steps:[],state:"draft",executable:false});
}
