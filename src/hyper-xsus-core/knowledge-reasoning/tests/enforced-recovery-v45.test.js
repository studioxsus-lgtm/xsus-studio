import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,readFile,symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
const clean={sequence:1,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]};
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-enforced-v45-"));
 const archiveDirectory=join(root,"archive"),checkpointDirectory=join(root,"checkpoint");
 let reviewer=async()=>true;
 const make=()=>createIncidentRecoveryIntegration({
  archiveDirectory,checkpointDirectory,archiveKey:"a".repeat(48),
  checkpointKey:"b".repeat(48),archiveKeyId:"enforced-archive",
  checkpointKeyId:"enforced-checkpoint",authorize:async input=>reviewer(input)
 });
 try{await fn({make,archiveDirectory,checkpointDirectory,setReviewer:fn=>{reviewer=fn;}});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper Audit v4.5 — enforced promotion readiness",()=>{
 it("promotes a clean, reviewed signed tail",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await expect(r.promote()).resolves.toMatchObject({status:"promoted"});
  expect(await make().readCheckpoint()).toMatchObject({count:1});
 }));
 it("blocks pending checkpoint artifact before reviewer",async()=>fixture(async({make,checkpointDirectory,setReviewer})=>{
  let calls=0;setReviewer(async()=>{calls++;return true;});
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await writeFile(join(checkpointDirectory,"checkpoint.pending"),"partial");
  await expect(r.promote()).rejects.toMatchObject({code:"EEXIST"});
  expect(calls).toBe(0);expect((await r.readCheckpoint()).count).toBe(0);
 }));
 it("blocks checkpoint lock before reviewer",async()=>fixture(async({make,checkpointDirectory,setReviewer})=>{
  let calls=0;setReviewer(async()=>{calls++;return true;});
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await mkdir(join(checkpointDirectory,"checkpoint.lock"));
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_LOCKED"});
  expect(calls).toBe(0);
 }));
 it("blocks archive lock before reviewer",async()=>fixture(async({make,archiveDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await mkdir(join(archiveDirectory,"writer.lock"));
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BLOCKED"});
 }));
 it("blocks residue created during reviewer callback",async()=>fixture(async({make,checkpointDirectory,setReviewer})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  setReviewer(async()=>{await writeFile(join(checkpointDirectory,"checkpoint.pending"),"interrupted");return true;});
  await expect(r.promote()).rejects.toMatchObject({code:"EEXIST"});
  expect((await r.readCheckpoint()).count).toBe(0);
 }));
 it("blocks checkpoint lock created during reviewer callback",async()=>fixture(async({make,checkpointDirectory,setReviewer})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  setReviewer(async()=>{await mkdir(join(checkpointDirectory,"checkpoint.lock"));return true;});
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_LOCKED"});
 }));
 it("rejects unsafe symlink pending artifact",async()=>fixture(async({make,checkpointDirectory})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  await symlink(checkpointDirectory,join(checkpointDirectory,"checkpoint.pending"));
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_RECOVERY_ARTIFACT_UNSAFE"});
 }));
 it("does not mutate checkpoint when reviewer denies",async()=>fixture(async({make,setReviewer})=>{
  const r=make();await r.initializeCheckpoint();await r.recordIncident(clean);
  setReviewer(async()=>false);
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_DENIED"});
  expect((await r.readCheckpoint()).count).toBe(0);
 }));
 it("does not allow promotion without a tail",async()=>fixture(async({make})=>{
  const r=make();await r.initializeCheckpoint();
  await expect(r.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BLOCKED"});
 }));
});
