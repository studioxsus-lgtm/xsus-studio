import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentEvidenceArchive} from "../incident-evidence-archive.js";
import {createIncidentPrefixGuard} from "../incident-prefix-guard.js";
const zero="0".repeat(64),a="a".repeat(64),b="b".repeat(64);
const report={sequence:1,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]};
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-prefix-v38-"));
 const directory=join(root,"evidence");
 const archive=createIncidentEvidenceArchive({directory,key:"v".repeat(48),keyId:"v38"});
 let trusted={count:0,tip:zero};
 const checkpoint={read:async()=>({...trusted})};
 const guard=()=>createIncidentPrefixGuard({directory,archive,checkpoint});
 try{await fn({directory,archive,guard,setTrusted:v=>{trusted=v;}});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper Audit v3.8 — independently anchored prefix integrity",()=>{
 it("accepts empty archive",async()=>fixture(async({guard})=>{
  expect(await guard().inspect()).toMatchObject({safeToResume:true,archiveCount:0});
 }));
 it("accepts exact signed checkpoint",async()=>fixture(async({archive,guard,setTrusted})=>{
  await archive.record(report);const v=await archive.verify();setTrusted({count:v.count,tip:v.tip});
  expect(await guard().inspect()).toMatchObject({safeToResume:true,archiveCount:1});
 }));
 it("detects valid unanchored tail",async()=>fixture(async({archive,guard,setTrusted})=>{
  await archive.record(report);const v=await archive.verify();setTrusted({count:1,tip:v.tip});
  await archive.record({...report,sequence:2});
  expect(await guard().inspect()).toMatchObject({blockers:["UNANCHORED_ARCHIVE_TAIL"]});
 }));
 it("detects forged trusted prefix even when archive is longer",async()=>fixture(async({archive,guard,setTrusted})=>{
  await archive.record(report);await archive.record({...report,sequence:2});
  setTrusted({count:1,tip:a});
  expect(await guard().inspect()).toMatchObject({blockers:["TRUSTED_PREFIX_FORK"]});
 }));
 it("detects exact-count fork",async()=>fixture(async({archive,guard,setTrusted})=>{
  await archive.record(report);setTrusted({count:1,tip:a});
  expect(await guard().inspect()).toMatchObject({blockers:["TRUSTED_PREFIX_FORK"]});
 }));
 it("detects archive rollback",async()=>fixture(async({archive,guard,setTrusted})=>{
  await archive.record(report);setTrusted({count:2,tip:a});
  expect(await guard().inspect()).toMatchObject({blockers:["ARCHIVE_ROLLBACK"]});
 }));
 it("detects truncated archive against anchored checkpoint",async()=>fixture(async({archive,guard,setTrusted,directory})=>{
  await archive.record(report);const v=await archive.verify();setTrusted({count:1,tip:v.tip});
  await unlink(join(directory,"incident-0000000000000001.json"));
  expect(await guard().inspect()).toMatchObject({blockers:["ARCHIVE_ROLLBACK"]});
 }));
 it("blocks orphaned lock",async()=>fixture(async({guard,directory})=>{
  await mkdir(directory,{recursive:true});await mkdir(join(directory,"writer.lock"));
  expect(await guard().inspect()).toMatchObject({blockers:["WRITER_LOCK_REVIEW_REQUIRED"]});
 }));
 it("blocks lock with unanchored tail",async()=>fixture(async({archive,guard,directory})=>{
  await archive.record(report);await mkdir(join(directory,"writer.lock"));
  expect(await guard().inspect()).toMatchObject({blockers:["WRITER_LOCK_REVIEW_REQUIRED","UNANCHORED_ARCHIVE_TAIL"]});
 }));
 it("rejects malformed lock path",async()=>fixture(async({guard,directory})=>{
  await mkdir(directory,{recursive:true});await writeFile(join(directory,"writer.lock"),"bad");
  await expect(guard().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_LOCK_UNSAFE"});
 }));
 it("rejects partial write artifact",async()=>fixture(async({guard,directory})=>{
  await mkdir(directory,{recursive:true});await writeFile(join(directory,"incident-0000000000000002.tmp"),"partial");
  await expect(guard().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_UNSAFE"});
 }));
 it("rejects bad checkpoint count",async()=>fixture(async({guard,setTrusted})=>{
  setTrusted({count:-1,tip:zero});
  await expect(guard().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_CHECKPOINT_INVALID"});
 }));
 it("rejects bad checkpoint tip",async()=>fixture(async({guard,setTrusted})=>{
  setTrusted({count:0,tip:"bad"});
  await expect(guard().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_CHECKPOINT_INVALID"});
 }));
 it("rejects inconsistent zero checkpoint",async()=>fixture(async({guard,setTrusted})=>{
  setTrusted({count:0,tip:a});
  await expect(guard().inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_CHECKPOINT_INVALID"});
 }));
 it("rejects malformed signed archive result",async()=>fixture(async({directory})=>{
  const fake={verify:async()=>({count:1,tip:a,entries:[]})};
  const guard=createIncidentPrefixGuard({directory,archive:fake,checkpoint:{read:async()=>({count:0,tip:zero})}});
  await expect(guard.inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_INVALID"});
 }));
 it("detects checkpoint mutation",async()=>fixture(async({directory,archive})=>{
  let calls=0;
  const guard=createIncidentPrefixGuard({directory,archive,checkpoint:{read:async()=>({count:0,tip:++calls===1?zero:a})}});
  await expect(guard.inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_CHECKPOINT_CHANGED"});
 }));
 it("detects archive tip mutation",async()=>fixture(async({directory})=>{
  let calls=0;
  const fake={verify:async()=>({count:0,tip:++calls===1?zero:a,entries:[]})};
  const guard=createIncidentPrefixGuard({directory,archive:fake,checkpoint:{read:async()=>({count:0,tip:zero})}});
  await expect(guard.inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_CHANGED"});
 }));
 it("detects same-tip entry mutation",async()=>fixture(async({directory})=>{
  let calls=0;
  const fake={verify:async()=>({count:2,tip:b,entries:[{sequence:1,signature:++calls===1?a:b},{sequence:2,signature:b}]})};
  const guard=createIncidentPrefixGuard({directory,archive:fake,checkpoint:{read:async()=>({count:0,tip:zero})}});
  await expect(guard.inspect()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_CHANGED"});
 }));
 it("returns immutable report",async()=>fixture(async({guard})=>{
  const r=await guard().inspect();expect(Object.isFrozen(r)).toBe(true);
  expect(Object.isFrozen(r.blockers)).toBe(true);
 }));
 it("rejects missing dependencies",()=>{
  expect(()=>createIncidentPrefixGuard({})).toThrow(TypeError);
 });
 it("verifies 40 signed records and their trusted prefix",async()=>fixture(async({archive,guard,setTrusted})=>{
  for(let i=0;i<40;i++){
   await archive.record({...report,sequence:i});
   if(i===19){const v=await archive.verify();setTrusted({count:v.count,tip:v.tip});}
  }
  expect(await guard().inspect()).toMatchObject({archiveCount:40,trustedCount:20,blockers:["UNANCHORED_ARCHIVE_TAIL"]});
 }));
});
