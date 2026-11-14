import {it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
it("v5.7 opt-in facade persists verified decisions across fresh instances without altering checkpoint",async()=>{
 const root=await mkdtemp(join(tmpdir(),"xsus-v57-integration-"));
 const options={
  archiveDirectory:join(root,"archive"),checkpointDirectory:join(root,"checkpoint"),
  archiveKey:"a".repeat(48),checkpointKey:"b".repeat(48),
  archiveKeyId:"v57-archive",checkpointKeyId:"v57-checkpoint",
  authorize:async()=>true,
  durableAudit:{directory:join(root,"durable"),key:"c".repeat(48),keyId:"v57-decisions"}
 };
 try{
  const first=createIncidentRecoveryIntegration(options);
  await first.initializeCheckpoint();
  await first.initializeDurableRecoveryAudit();
  const before=await first.readCheckpoint();
  const recorded=await first.recordDurableRecoveryAudit();
  expect(recorded.payload).toMatchObject({verified:true,safeToResume:true});
  const pending=join(root,"checkpoint","checkpoint.pending");
  await writeFile(pending,"manual-review");
  const second=createIncidentRecoveryIntegration(options);
  const next=await second.recordDurableRecoveryAudit();
  expect(next.payload).toMatchObject({verified:true,safeToResume:false});
  expect((await second.readDurableRecoveryAudit()).count).toBe(2);
  expect(await readFile(pending,"utf8")).toBe("manual-review");
  expect(await second.readCheckpoint()).toEqual(before);
 }finally{await rm(root,{recursive:true,force:true});}
});
