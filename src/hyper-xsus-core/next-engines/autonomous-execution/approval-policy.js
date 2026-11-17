import {EngineContractError,object,string} from "../contracts.js";
export function inspectExecutionManifest(manifest) {
  object(manifest,"manifest");
  const id=string(manifest.id,"id"),operation=string(manifest.operation,"operation");
  if(manifest.command!==undefined||manifest.script!==undefined)throw new EngineContractError("UNSAFE_PAYLOAD","Raw commands forbidden");
  const allowed=["read","analyze","simulate"];
  if(!allowed.includes(operation))throw new EngineContractError("UNSUPPORTED_OPERATION","Operation not allowed");
  return {id,operation,simulationOnly:true,approved:false,executable:false};
}
