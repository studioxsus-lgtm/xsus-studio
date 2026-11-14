import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
import {createRecoveryReadinessGuard} from "../recovery-readiness-guard.js";
const clean={sequence:1,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]};
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-readiness-v44-"));
 const archiveDirectory=join(root,"archive"),checkpointDirectory=join(root,"checkpoint");
 const make=()=>createIncidentRecoveryIntegration({
  archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
  checkpointKey:"b".repeat(48),archiveKeyId:"readiness-archive",
  checkpointKeyId:"readiness-checkpoint",authorize:async()=>true
 });
 try{await fn({make,archiveDirectory,checkpointDirectory,root});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper Audit v4.4 — recovery readiness and filesystem residues",()=>{
 it("accepts fully anchored state",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);await r.promote();
  expect(await make().inspectReadiness()).toMatchObject({safeToResume:true,blockers:[]});
 }));
 it("blocks unanchored archive tail",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  expect(await r.inspectReadiness()).toMatchObject({safeToResume:false,blockers:["UNANCHORED_ARCHIVE_TAIL"]});
 }));
 it("detects pending checkpoint write after restart",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await writeFile(join(checkpointDirectory,"checkpoint.pending"),"partial");
  expect(await make().inspectReadiness()).toMatchObject({safeToResume:false,blockers:["CHECKPOINT_PENDING_REVIEW_REQUIRED"]});
 }));
 it("detects orphaned checkpoint writer lock",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await mkdir(join(checkpointDirectory,"checkpoint.lock"));
  expect(await make().inspectReadiness()).toMatchObject({safeToResume:false,blockers:["CHECKPOINT_WRITER_LOCK_REVIEW_REQUIRED"]});
 }));
 it("detects orphaned archive writer lock",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await mkdir(archiveDirectory,{recursive:true});
  await mkdir(join(archiveDirectory,"writer.lock"));
  const state=await make().inspectReadiness();
  expect(state.safeToResume).toBe(false);
  expect(state.blockers).toContain("ARCHIVE_WRITER_LOCK_REVIEW_REQUIRED");
 }));
 it("rejects symlink checkpoint residue",async()=>fixture(async({make,checkpointDirectory,root})=>{
  const r=make();await r.initializeCheckpoint();await symlink(root,join(checkpointDirectory,"checkpoint.pending"));
  await expect(make().inspectReadiness()).rejects.toMatchObject({code:"XSUS_RECOVERY_ARTIFACT_UNSAFE"});
 }));
 it("rejects non-directory archive lock artifact",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await mkdir(archiveDirectory,{recursive:true});
  await writeFile(join(archiveDirectory,"writer.lock"),"unsafe");
  await expect(make().inspectReadiness()).rejects.toMatchObject({code:"XSUS_RECOVERY_ARTIFACT_UNSAFE"});
 }));
 it("preserves original inspect contract",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  expect(await r.inspect()).toMatchObject({safeToResume:true,status:"consistent"});
  expect(await r.inspectReadiness()).toMatchObject({safeToResume:true,status:"consistent"});
 }));
 it("readiness guard is immutable",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  const result=await r.inspectReadiness();
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.blockers)).toBe(true);
 }));
 it("rejects same directory",async()=>fixture(async({archiveDirectory})=>{
  expect(()=>createRecoveryReadinessGuard({archiveDirectory,checkpointDirectory:archiveDirectory,inspect:async()=>({})})).toThrow(TypeError);
 }));
 it("rejects invalid core assessment",async()=>fixture(async({archiveDirectory,checkpointDirectory})=>{
  const guard=createRecoveryReadinessGuard({archiveDirectory,checkpointDirectory,inspect:async()=>null});
  await expect(guard.assess()).rejects.toMatchObject({code:"XSUS_RECOVERY_ASSESSMENT_INVALID"});
 }));
});
