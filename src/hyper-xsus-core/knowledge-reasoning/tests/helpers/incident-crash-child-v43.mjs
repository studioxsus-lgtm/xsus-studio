/**
 * v4.3 subprocess crash harness.
 * Holds an actual filesystem writer lock when the parent sends SIGKILL.
 * This exercises process death and residue handling, not kill at an
 * instrumented fsync/rename instruction boundary.
 */
import {mkdir} from "node:fs/promises";
import {join} from "node:path";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
const [archiveDirectory,checkpointDirectory,mode]=process.argv.slice(2);
const engine=createIncidentRecoveryIntegration({
 archiveDirectory,checkpointDirectory,
 archiveKey:"a".repeat(48),checkpointKey:"b".repeat(48),
 archiveKeyId:"crash-archive",checkpointKeyId:"crash-checkpoint",
 authorize:async()=>true
});
if(mode==="archive"){
 await mkdir(join(archiveDirectory,"writer.lock"));
}else if(mode==="checkpoint"){
 await mkdir(join(checkpointDirectory,"checkpoint.lock"));
}else throw new Error("Unknown crash mode");
process.stdout.write("LOCK_READY\n");
setInterval(()=>{},1000);
