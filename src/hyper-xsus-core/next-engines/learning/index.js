import {request,result,string} from "../contracts.js";
export const ENGINE_ID="learning";
export function proposeLearning(input) {
  const req=request(input,ENGINE_ID,"learning.propose");
  string(req.payload.content,"content");
  string(req.payload.sourceRef,"sourceRef");
  return result(req,{state:"proposed",verified:false,persisted:false,sourceRef:req.payload.sourceRef});
}
