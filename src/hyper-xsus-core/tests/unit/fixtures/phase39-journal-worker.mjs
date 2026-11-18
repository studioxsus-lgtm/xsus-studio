import {createPersistentDecisionJournalStore} from "../../../next-engines/orchestration/persistent-decision-journal.js";
import {coordinateSixEngines} from "../../../next-engines/orchestration/index.js";
import {withExclusiveFileLock} from "../../../knowledge-graph/integration/exclusive-file-lock.js";
const [mode,filePath,id="phase39"]=process.argv.slice(2);
const request={contractVersion:"1.0.0",requestId:id,engineId:"six-engine-orchestration",
 operation:"orchestration.coordinate",payload:{inputs:{}},
 context:{principalId:"tester",traceId:"trace-"+id,authorizationRef:"policy:test"}};
async function main(){
 if(mode==="hold"){
  await withExclusiveFileLock(filePath,async()=>{
   // Arm the release listener before publishing LOCKED: the parent may
   // respond immediately, otherwise a fast release can be missed.
   const released=new Promise(resolve=>process.stdin.once("data",resolve));
   process.stdin.resume();
   process.stdout.write("LOCKED\n");
   await released;
   // A flowing stdin stream otherwise keeps this worker alive even after
   // the exclusive lock has been released and main() has returned.
   process.stdin.pause();
  });
  return;
 }
 const store=createPersistentDecisionJournalStore({filePath});
 if(mode==="save"){const result=await store.save(coordinateSixEngines(request));process.stdout.write(JSON.stringify(result)+"\n");return;}
 if(mode==="load"){const result=await store.load();process.stdout.write(JSON.stringify(result)+"\n");return;}
 throw Error("Unknown worker mode");
}
main().catch(error=>{process.stderr.write(JSON.stringify({code:error.code??null,message:error.message})+"\n");process.exitCode=1;});
