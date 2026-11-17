import {EngineContractError,object,string} from "../contracts.js";
const STATES=new Set(["success","rejected"]);
const STAGE_ORDER=["truth","learning","planning","execution","improvement","agents"];
const STAGES=new Set(STAGE_ORDER);
const invalid=()=>new EngineContractError("INVALID_INPUT","Invalid decision journal");
function validateCode(entry){
  if(entry.status==="rejected"){
    if(entry.code!==null&&entry.code!==undefined)string(entry.code,"code");
  }else if(entry.code!==null&&entry.code!==undefined)throw invalid();
}
export function createDecisionJournal(response) {
  object(response,"response");
  if(response.engineId!=="six-engine-orchestration"||response.contractVersion!=="1.0.0")throw new EngineContractError("INVALID_INPUT","Unexpected orchestration response");
  const requestId=string(response.requestId,"requestId");
  const traceId=string(object(response.metadata,"metadata").traceId,"traceId");
  const data=object(response.result,"result");
  if(!Array.isArray(data.stages)||data.stages.length>6||data.sideEffects!==false||data.authorizedForExecution!==false)throw new EngineContractError("INVALID_INPUT","Unsafe or invalid orchestration result");
  if(data.state!=="review_required"||data.completed!==data.stages.length||data.rejected!==data.stages.filter(s=>s?.status==="rejected").length)throw invalid();
  const seen=new Set();
  let previous=-1;
  const entries=data.stages.map((stage,index)=>{
    object(stage,"stage");
    if(!STAGES.has(stage.stage)||seen.has(stage.stage)||!STATES.has(stage.status))throw new EngineContractError("INVALID_INPUT","Invalid stage");
    const position=STAGE_ORDER.indexOf(stage.stage);
    if(position<=previous)throw invalid();
    previous=position;
    seen.add(stage.stage);
    if(stage.status==="rejected"&&stage.errorCode!==undefined)string(stage.errorCode,"errorCode");
    if(stage.status==="success"&&stage.errorCode!==undefined)throw invalid();
    return Object.freeze({sequence:index+1,stage:stage.stage,status:stage.status,code:stage.errorCode??null});
  });
  return Object.freeze({schemaVersion:1,requestId,traceId,entries:Object.freeze(entries),sideEffects:false,executionAuthorized:false});
}
export function replayDecisionJournal(journal) {
  object(journal,"journal");
  if(journal.schemaVersion!==1||journal.sideEffects!==false||journal.executionAuthorized!==false)throw new EngineContractError("INVALID_INPUT","Invalid journal contract");
  string(journal.requestId,"requestId");string(journal.traceId,"traceId");
  if(!Array.isArray(journal.entries)||journal.entries.length>6)throw new EngineContractError("INVALID_INPUT","Invalid journal entries");
  const seen=new Set();
  let previous=-1;
  for(let i=0;i<journal.entries.length;i++){
    const entry=object(journal.entries[i],"entry");
    if(entry.sequence!==i+1||!STAGES.has(entry.stage)||seen.has(entry.stage)||!STATES.has(entry.status))throw new EngineContractError("INVALID_INPUT","Invalid journal sequence");
    const position=STAGE_ORDER.indexOf(entry.stage);
    if(position<=previous)throw invalid();
    previous=position;
    validateCode(entry);
    seen.add(entry.stage);
  }
  return {state:"review_required",completed:journal.entries.length,rejected:journal.entries.filter(e=>e.status==="rejected").length,executionAuthorized:false,sideEffects:false};
}
