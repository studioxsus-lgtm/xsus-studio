/**
 * v4.8 independent Node.js subprocess harness.
 * Inputs: archiveDirectory checkpointDirectory mode [sequence]
 * Emits one JSON line for completed operations; REVIEW_READY for paused reviewer.
 */
import {createIncidentRecoveryIntegration} from "../../incident-recovery-integration.js";
const [archiveDirectory,checkpointDirectory,mode,rawSequence]=process.argv.slice(2);
const report=n=>({sequence:n,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]});
const authorize=mode==="pause-review"
 ?async()=>{process.stdout.write("REVIEW_READY\n");await new Promise(()=>{});}
 :async()=>true;
const engine=createIncidentRecoveryIntegration({
 archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
 checkpointKey:"b".repeat(48),archiveKeyId:"process-archive",
 checkpointKeyId:"process-checkpoint",authorize
});
try{
 let result;
 switch(mode){
  case "append":result=await engine.recordIncident(report(Number(rawSequence)));break;
  case "promote":result=await engine.promote();break;
  case "pause-review":result=await engine.promote();break;
  case "inspect":result=await engine.inspectReadiness();break;
  case "checkpoint":result=await engine.readCheckpoint();break;
  default:throw new Error("Unknown mode");
 }
 process.stdout.write(JSON.stringify({ok:true,result})+"\n");
}catch(error){
 process.stdout.write(JSON.stringify({ok:false,code:error.code||"UNKNOWN",message:error.message})+"\n");
 process.exitCode=1;
}
