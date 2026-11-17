import {request,result,string,EngineContractError} from "../contracts.js";
export const ENGINE_ID="strategic-planning";
export function createPlan(input) {
  const req=request(input,ENGINE_ID,"planning.create");
  const goal=string(req.payload.goal,"goal");
  if(goal.length>4096) throw new EngineContractError("INPUT_TOO_LARGE","Goal exceeds limit");
  return result(req,{goal,steps:[],state:"draft",executable:false});
}
