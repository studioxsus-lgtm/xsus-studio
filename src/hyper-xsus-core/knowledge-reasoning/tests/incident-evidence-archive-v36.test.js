import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,unlink,readdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createIncidentEvidenceArchive} from "../incident-evidence-archive.js";
const key="e".repeat(48);
const clean={sequence:4,status:"verified",safeToResume:true,blockers:[],missingReceipts:[],unexpectedReceipts:[]};
const blocked={sequence:5,status:"manual-intervention-required",safeToResume:false,
 blockers:["MISSING_RECOVERY_RECEIPTS"],missingReceipts:[5],unexpectedReceipts:[]};
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-incident-v36-"));
 const directory=join(root,"evidence");
 const make=(options={})=>createIncidentEvidenceArchive({directory,key,keyId:"v36",...options});
 try{await fn({directory,make});}finally{await rm(root,{recursive:true,force:true});}
}
const file=n=>`incident-${String(n).padStart(16,"0")}.json`;
describe("Hyper Audit v3.6 — authenticated incident evidence archive",()=>{
 it("verifies an empty archive",async()=>fixture(async({make})=>{
  expect(await make().verify()).toMatchObject({count:0,tip:"0".repeat(64)});
 }));
 it("persists and verifies a single signed decision",async()=>fixture(async({make})=>{
  const archive=make();const receipt=await archive.record(clean);
  expect(receipt.sequence).toBe(1);
  expect(await make().verify()).toMatchObject({count:1,tip:receipt.signature});
 }));
 it("preserves append order across runtime recreation",async()=>fixture(async({make})=>{
  await make().record(clean);await make().record(blocked);
  const verified=await make().verify();
  expect(verified.entries.map(x=>x.report.sequence)).toEqual([4,5]);
 }));
 it("detects tampering with a signed report",async()=>fixture(async({make,directory})=>{
  await make().record(clean);
  const path=join(directory,file(1)),data=JSON.parse(await readFile(path,"utf8"));
  data.report.sequence=999;await writeFile(path,JSON.stringify(data));
  await expect(make().verify()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_SIGNATURE"});
 }));
 it("detects deletion of an earlier signed record",async()=>fixture(async({make,directory})=>{
  await make().record(clean);await make().record(blocked);
  await unlink(join(directory,file(1)));
  await expect(make().verify()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_GAP"});
 }));
 it("detects deletion of a middle record",async()=>fixture(async({make,directory})=>{
  await make().record(clean);await make().record(blocked);await make().record(clean);
  await unlink(join(directory,file(2)));
  await expect(make().verify()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_GAP"});
 }));
 it("detects incorrect key",async()=>fixture(async({make})=>{
  await make().record(clean);
  await expect(make({key:"f".repeat(48)}).verify()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_SIGNATURE"});
 }));
 it("detects incorrect key ID",async()=>fixture(async({make})=>{
  await make().record(clean);
  await expect(make({keyId:"other"}).verify()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_INVALID"});
 }));
 it("detects corrupted JSON",async()=>fixture(async({make,directory})=>{
  await make().record(clean);
  await writeFile(join(directory,file(1)),"{");
  await expect(make().verify()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_INVALID"});
 }));
 it("rejects forged signature",async()=>fixture(async({make,directory})=>{
  await make().record(clean);
  const path=join(directory,file(1)),data=JSON.parse(await readFile(path,"utf8"));
  data.signature="0".repeat(64);await writeFile(path,JSON.stringify(data));
  await expect(make().verify()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_SIGNATURE"});
 }));
 it("rejects invalid report sequence",async()=>fixture(async({make})=>{
  await expect(make().record({...clean,sequence:-1})).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_REPORT_INVALID"});
 }));
 it("rejects invalid verified decision with blockers",async()=>fixture(async({make})=>{
  await expect(make().record({...clean,blockers:["LOCK_REVIEW_REQUIRED"]})).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_REPORT_INVALID"});
 }));
 it("rejects unsafe resume in manual-review status",async()=>fixture(async({make})=>{
  await expect(make().record({...blocked,safeToResume:true})).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_REPORT_INVALID"});
 }));
 it("rejects malformed missing receipt numbers",async()=>fixture(async({make})=>{
  await expect(make().record({...blocked,missingReceipts:[-2]})).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_REPORT_INVALID"});
 }));
 it("rejects noncanonical report data",async()=>fixture(async({make,directory})=>{
  await make().record(clean);
  const path=join(directory,file(1)),data=JSON.parse(await readFile(path,"utf8"));
  data.report.extra="injected";await writeFile(path,JSON.stringify(data));
  await expect(make().verify()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_INVALID"});
 }));
 it("rejects forged chain predecessor",async()=>fixture(async({make,directory})=>{
  await make().record(clean);await make().record(blocked);
  const path=join(directory,file(2)),data=JSON.parse(await readFile(path,"utf8"));
  data.previous="f".repeat(64);await writeFile(path,JSON.stringify(data));
  await expect(make().verify()).rejects.toMatchObject({code:"XSUS_INCIDENT_ARCHIVE_INVALID"});
 }));
 it("keeps immutable returned verification summary",async()=>fixture(async({make})=>{
  await make().record(clean);
  const result=await make().verify();
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.entries)).toBe(true);
 }));
 it("supports 60 sequential authenticated records",async()=>fixture(async({make})=>{
  const archive=make();
  for(let i=0;i<60;i++)await archive.record({...clean,sequence:i});
  const verified=await make().verify();
  expect(verified.count).toBe(60);
  expect(verified.entries[59].report.sequence).toBe(59);
 }));
 it("fails closed on concurrent append conflict or serializes valid records",async()=>fixture(async({make})=>{
  const a=make(),b=make();
  const results=await Promise.allSettled([a.record(clean),b.record(blocked)]);
  const verified=await make().verify();
  expect(verified.count).toBe(results.filter(x=>x.status==="fulfilled").length);
  expect(verified.count).toBeGreaterThanOrEqual(1);
 }));
 it("rejects invalid key material",async()=>fixture(async({directory})=>{
  expect(()=>createIncidentEvidenceArchive({directory,key:"short",keyId:"v36"})).toThrow(TypeError);
 }));
});
