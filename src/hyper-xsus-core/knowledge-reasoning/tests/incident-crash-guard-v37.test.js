import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentEvidenceArchive} from "../incident-evidence-archive.js";
import {createIncidentCrashGuard} from "../incident-crash-guard.js";
const clean={sequence:1,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]};
const zero="0".repeat(64);
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-crash-v37-"));
 const directory=join(root,"archive");
 const archive=createIncidentEvidenceArchive({directory,key:"q".repeat(48),keyId:"v37"});
 let trusted={count:0,tip:zero};
 const checkpoint={read:async()=>({...trusted})};
 const guard=()=>createIncidentCrashGuard({directory,archive,checkpoint});
 try{await fn({directory,archive,guard,setTrusted:v=>{trusted=v;},checkpoint});}
 finally{await rm(root,{recursive:true,force:true});}
}
const name=n=>`incident-${String(n).padStart(16,"0")}.json`;
describe("Hyper Audit v3.7 — independent checkpoint and crash guard",()=>{
 it("accepts an empty trusted archive",async()=>fixture(async({guard})=>{
  expect(await guard().inspect()).toMatchObject({status:"consistent",safeToResume:true,archiveCount:0});
 }));
 it("accepts fully anchored signed archive",async()=>fixture(async({archive,guard,setTrusted})=>{
  await archive.record(clean);setTrusted(await archive.verify());
  expect(await guard().inspect()).toMatchObject({status:"consistent",safeToResume:true,archiveCount:1});
 }));
 it("blocks unanchored signed append",async()=>fixture(async({archive,guard})=>{
  await archive.record(clean);
  expect(await guard().inspect()).toMatchObject({safeToResume:false,blockers:["UNANCHORED_ARCHIVE_TAIL"]});
 }));
 it("blocks truncated archive after trusted checkpoint",async()=>fixture(async({archive,guard,setTrusted,directory})=>{
  await archive.record(clean);setTrusted(await archive.verify());
  await unlink(join(directory,name(1)));
  expect(await guard().inspect()).toMatchObject({safeToResume:false,blockers:["ARCHIVE_ROLLBACK_OR_FORK"]});
 }));
 it("blocks a forged checkpoint tip",async()=>fixture(async({archive,guard,setTrusted})=>{
  await archive.record(clean);setTrusted({count:1,tip:"f".repeat(64)});
  expect(await guard().inspect()).toMatchObject({safeToResume:false,blockers:["ARCHIVE_ROLLBACK_OR_FORK"]});
 }));
 it("blocks orphaned writer lock",async()=>fixture(async({directory,guard})=>{
  await mkdir(directory,{recursive:true});await mkdir(join(directory,"writer.lock"));
  expect(await guard().inspect()).toMatchObject({safeToResume:false,lock:"present",blockers:["WRITER_LOCK_REVIEW_REQUIRED"]});
 }));
 it("blocks orphaned writer lock plus unanchored tail",async()=>fixture(async({directory,archive,guard})=>{
  await archive.record(clean);await mkdir(join(directory,"writer.lock"));
  expect(await guard().inspect()).toMatchObject({blockers:["WRITER_LOCK_REVIEW_REQUIRED","UNANCHORED_ARCHIVE_TAIL"]});
 }));
 it("rejects unexpected temporary incident file",async()=>fixture(async({directory,guard})=>{
  await mkdir(directory,{recursive:true});await writeFile(join(directory,"incident-partial.tmp"),"partial");
  await expect(guard().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_UNSAFE"});
 }));
 it("rejects writer lock replaced with regular file",async()=>fixture(async({directory,guard})=>{
  await mkdir(directory,{recursive:true});await writeFile(join(directory,"writer.lock"),"fake");
  await expect(guard().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_LOCK_UNSAFE"});
 }));
 it("rejects malformed checkpoint",async()=>fixture(async({guard,setTrusted})=>{
  setTrusted({count:-1,tip:zero});
  await expect(guard().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_CHECKPOINT_INVALID"});
 }));
 it("rejects missing checkpoint",async()=>fixture(async({guard,setTrusted})=>{
  setTrusted(null);
  await expect(guard().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_CHECKPOINT_INVALID"});
 }));
 it("rejects invalid checkpoint signature format",async()=>fixture(async({guard,setTrusted})=>{
  setTrusted({count:0,tip:"invalid"});
  await expect(guard().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_CHECKPOINT_INVALID"});
 }));
 it("propagates archive signature tampering",async()=>fixture(async({archive,guard,directory})=>{
  await archive.record(clean);await writeFile(join(directory,name(1)),"{bad");
  await expect(guard().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_INVALID"});
 }));
 it("rejects missing required dependencies",()=>{
  expect(()=>createIncidentCrashGuard({})).toThrow(TypeError);
 });
 it("returns immutable report and blockers",async()=>fixture(async({guard})=>{
  const report=await guard().inspect();
  expect(Object.isFrozen(report)).toBe(true);
  expect(Object.isFrozen(report.blockers)).toBe(true);
 }));
 it("detects checkpoint changes during inspection",async()=>fixture(async({directory,archive})=>{
  let n=0;
  const checkpoint={read:async()=>{n++;return {count:n>1?1:0,tip:zero};}};
  const guard=createIncidentCrashGuard({directory,archive,checkpoint});
  await expect(guard.inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_CHECKPOINT_CHANGED"});
 }));
 it("detects archive changes during inspection",async()=>fixture(async({directory,archive})=>{
  let n=0;
  const verifier={verify:async()=>{n++;return {count:n>1?1:0,tip:zero,entries:n>1?[{}]:[]};}};
  const guard=createIncidentCrashGuard({directory,archive:verifier,checkpoint:{read:async()=>({count:0,tip:zero})}});
  await expect(guard.inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_CHANGED"});
 }));
 it("verifies 30 anchored incident records after restart",async()=>fixture(async({archive,guard,setTrusted})=>{
  for(let i=0;i<30;i++)await archive.record({...clean,sequence:i});
  const trusted=await archive.verify();setTrusted({count:trusted.count,tip:trusted.tip});
  expect(await guard().inspect()).toMatchObject({status:"consistent",archiveCount:30});
 }));
});
