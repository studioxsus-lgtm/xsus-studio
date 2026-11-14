import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
import {createRecoverySecurityValidation} from "../recovery-security-validation-v68.js";
const Z="0".repeat(64);
const healthy=(anchor={count:0,tip:Z},audit={count:0,tip:Z})=>({status:"ready",safeToResume:true,blockers:[],anchor,audit});
const validate=inspectHealth=>createRecoverySecurityValidation({inspectHealth}).assess();
async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-security-v69-"));
 const auditDirectory=join(root,"audit"),directory=join(root,"anchor");
 const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"v69-audit",maxEntries:200});
 const config={directory,key:"b".repeat(48),keyId:"v69-anchor",auditDirectory,readDurableAudit:()=>audit.read(),authorize:async()=>true};
 const anchor=createTrustedRecoveryAuditAnchor(config);
 const fresh=()=>validate(()=>createTrustedRecoveryAuditAnchor(config).inspectHealth());
 try{await audit.initialize();await anchor.initialize();await run({audit,anchor,fresh,directory,auditDirectory});}
 finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper XSUS Core v6.9 — advanced security and integrity stress",()=>{
 it("performs 50 consecutive authenticated security checks",async()=>fixture(async({fresh})=>{
  for(let i=0;i<50;i++)expect((await fresh()).safeToResume).toBe(true);
 }),90000);
 it("performs 30 sequential signed audit and anchor cycles",async()=>fixture(async({audit,anchor,fresh})=>{
  for(let i=1;i<=30;i++){
   await audit.append({i});await anchor.advance();
   const x=await fresh();expect(x.safeToResume).toBe(true);expect(x.anchor.count).toBe(i);
  }
 }),90000);
 it("supports 60 concurrent read-only verifications of stable signed state",async()=>fixture(async({audit,anchor,fresh})=>{
  for(let i=0;i<6;i++)await audit.append({i});
  await anchor.advance();
  const results=await Promise.all(Array.from({length:60},()=>fresh()));
  expect(results.every(x=>x.safeToResume&&x.anchor.count===6)).toBe(true);
 }),90000);
 it("detects authenticated rollback on 20 consecutive inspections",async()=>fixture(async({audit,anchor,auditDirectory,fresh})=>{
  for(let i=1;i<=3;i++)await audit.append({i});
  const file=join(auditDirectory,"audit.json"),old=await readFile(file,"utf8");
  for(let i=4;i<=9;i++)await audit.append({i});
  await anchor.advance();await writeFile(file,old);
  for(let i=0;i<20;i++)expect((await fresh()).safeToResume).toBe(false);
 }),90000);
 it("preserves pending checkpoint evidence through 20 inspections",async()=>fixture(async({directory,fresh})=>{
  const file=join(directory,"checkpoint.pending");await writeFile(file,"review");
  for(let i=0;i<20;i++)expect((await fresh()).safeToResume).toBe(false);
  expect(await readFile(file,"utf8")).toBe("review");
 }),90000);
 it("preserves checkpoint writer lock through 20 inspections",async()=>fixture(async({directory,fresh})=>{
  await mkdir(join(directory,"checkpoint.lock"));
  for(let i=0;i<20;i++)expect((await fresh()).safeToResume).toBe(false);
 }),90000);
 it("rejects forged ready reports containing blockers",async()=>{
  const x=await validate(async()=>({...healthy(),blockers:["REVIEW_REQUIRED"]}));
  expect(x.safeToResume).toBe(false);expect(x.blockers).toContain("SECURITY_HEALTH_INVALID");
 });
 it("rejects changing trusted anchor between inspections",async()=>{
  let n=0;const x=await validate(async()=>healthy({count:n++,tip:Z},{count:5,tip:Z}));
  expect(x.safeToResume).toBe(false);expect(x.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });
 it("rejects changing audit between inspections",async()=>{
  let n=0;const x=await validate(async()=>healthy(undefined,{count:n++,tip:Z}));
  expect(x.safeToResume).toBe(false);expect(x.blockers).toContain("SECURITY_STATE_UNSTABLE");
 });
 it("blocks malformed signed marks rather than trusting ready status",async()=>{
  const x=await validate(async()=>healthy({count:0,tip:"bad"}));
  expect(x.safeToResume).toBe(false);expect(x.blockers).toContain("SECURITY_HEALTH_INVALID");
 });
 it("keeps snapshots stable if the inspector mutates prior reports",async()=>{
  const first=healthy(),second=healthy();let n=0;
  const x=await validate(async()=>{
   if(n++===0)return first;
   first.anchor.count=99;first.audit.count=99;
   return second;
  });
  expect(x.safeToResume).toBe(true);expect(x.anchor.count).toBe(0);
 });
 it("fails closed for known signed-state inspection errors",async()=>{
  const x=await validate(async()=>{throw Object.assign(new Error("invalid signature"),{code:"XSUS_CHECKPOINT_SIGNATURE"});});
  expect(x.safeToResume).toBe(false);expect(x.blockers).toContain("SECURITY_INSPECTION_ERROR");
 });
});