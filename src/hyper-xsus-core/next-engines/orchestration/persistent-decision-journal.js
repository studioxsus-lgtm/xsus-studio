import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {writeAtomicJson} from "../../knowledge-graph/integration/atomic-json-writer.js";
import {withExclusiveFileLock} from "../../knowledge-graph/integration/exclusive-file-lock.js";
import {createDecisionJournal,replayDecisionJournal} from "./decision-journal.js";
import {createRecoveryCheckpoint,inspectRecoveryCheckpoint} from "./recovery-checkpoint.js";
import {EngineContractError,string,object} from "../contracts.js";
const VERSION=1;
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function createPersistentDecisionJournalStore({filePath}) {
  string(filePath,"filePath");
  let queue=Promise.resolve();
  const serialize=fn=>{
    const operation=queue.catch(()=>{}).then(()=>withExclusiveFileLock(filePath,fn));
    queue=operation.then(()=>undefined,()=>undefined);
    return operation;
  };
  async function readSnapshot(){
    let raw;
    try{raw=await readFile(filePath,"utf8");}
    catch(error){if(error?.code==="ENOENT")return null;throw error;}
    let envelope;
    try{envelope=JSON.parse(raw);}catch{throw new EngineContractError("CORRUPT_JOURNAL","Invalid journal JSON");}
    object(envelope,"envelope");
    if(envelope.version!==VERSION||typeof envelope.digest!=="string"||envelope.digest!==digest(envelope.payload))throw new EngineContractError("CORRUPT_JOURNAL","Journal integrity mismatch");
    const payload=object(envelope.payload,"payload");
    replayDecisionJournal(payload.journal);
    inspectRecoveryCheckpoint(payload.checkpoint,payload.journal);
    return payload;
  }
  function save(response){
    const journal=createDecisionJournal(response);
    const checkpoint=createRecoveryCheckpoint(journal);
    const payload={journal,checkpoint};
    return serialize(async()=>{
      const current=await readSnapshot();
      if(current&&current.journal.requestId!==journal.requestId)throw new EngineContractError("JOURNAL_CONFLICT","Existing request differs");
      if(current&&digest(current)!==digest(payload))throw new EngineContractError("JOURNAL_CONFLICT","Existing journal or checkpoint differs");
      if(!current)await writeAtomicJson(filePath,{version:VERSION,payload,digest:digest(payload)});
      return {saved:true,requestId:journal.requestId,executionAuthorized:false};
    });
  }
  function load(){
    return serialize(async()=>{
      const payload=await readSnapshot();
      return payload===null?null:{journal:payload.journal,checkpoint:payload.checkpoint,recovered:true,executionAuthorized:false};
    });
  }
  return Object.freeze({save,load});
}
