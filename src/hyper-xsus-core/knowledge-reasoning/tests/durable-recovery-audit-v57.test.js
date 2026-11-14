import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
const fixture=async fn=>{
 const root=await mkdtemp(join(tmpdir(),"xsus-durable-audit-v57-"));
 const directory=join(root,"audit");
 const make=(key="a".repeat(48),maxEntries=1000)=>
  createDurableRecoveryAudit({directory,key,keyId:"v57-audit",maxEntries});
 try{await fn({root,directory,make});}finally{await rm(root,{recursive:true,force:true});}
};
describe("Hyper Audit v5.7 — authenticated durable audit persistence",()=>{
 it("initializes an empty authenticated journal",async()=>fixture(async({make})=>{
  const a=make();expect(await a.initialize()).toBe(true);
  expect(await a.initialize()).toBe(false);
  expect(await a.read()).toMatchObject({version:"5.7.0",count:0,tip:"0".repeat(64),entries:[]});
 }));
 it("survives a new instance and preserves order",async()=>fixture(async({make})=>{
  const a=make();await a.initialize();
  await a.append({kind:"decision",safeToResume:true});
  await a.append({kind:"decision",safeToResume:false});
  const restored=await make().read();
  expect(restored.count).toBe(2);
  expect(restored.entries.map(x=>x.sequence)).toEqual([1,2]);
  expect(restored.entries[1].previousHash).toBe(restored.entries[0].hash);
 }));
 it("detects snapshot corruption",async()=>fixture(async({make,directory})=>{
  const a=make();await a.initialize();await a.append({kind:"review"});
  const path=join(directory,"audit.json");
  const obj=JSON.parse(await readFile(path,"utf8"));obj.entries[0].payload.kind="tampered";
  await writeFile(path,JSON.stringify(obj));
  await expect(make().read()).rejects.toMatchObject({code:"XSUS_DURABLE_AUDIT_INTEGRITY"});
 }));
 it("rejects an incorrect signing key",async()=>fixture(async({make})=>{
  const a=make();await a.initialize();await a.append({kind:"review"});
  await expect(make("b".repeat(48)).read()).rejects.toMatchObject({code:"XSUS_DURABLE_AUDIT_INTEGRITY"});
 }));
 it("refuses to overwrite pending artifacts",async()=>fixture(async({make,directory})=>{
  const a=make();await a.initialize();
  await writeFile(join(directory,"audit.pending"),"interrupted");
  await expect(a.append({kind:"review"})).rejects.toMatchObject({code:"XSUS_DURABLE_AUDIT_PENDING"});
  expect((await a.read()).count).toBe(0);
 }));
 it("refuses a stale writer lock",async()=>fixture(async({make,directory})=>{
  const a=make();await a.initialize();
  await mkdir(join(directory,"audit.lock"));
  await expect(a.append({kind:"review"})).rejects.toMatchObject({code:"XSUS_DURABLE_AUDIT_LOCKED"});
 }));
 it("refuses capacity overflow without discarding history",async()=>fixture(async({make})=>{
  const a=make(undefined,1);await a.initialize();await a.append({kind:"first"});
  await expect(a.append({kind:"second"})).rejects.toMatchObject({code:"XSUS_DURABLE_AUDIT_FULL"});
  expect((await a.read()).count).toBe(1);
 }));
 it("serializes competing instances through exclusive writer lock",async()=>fixture(async({make})=>{
  const a=make();await a.initialize();
  const results=await Promise.allSettled(Array.from({length:12},(_,i)=>make().append({i})));
  const successes=results.filter(r=>r.status==="fulfilled").length;
  expect(successes).toBeGreaterThan(0);
  expect((await make().read()).count).toBe(successes);
  expect(results.filter(r=>r.status==="rejected").every(r=>r.reason.code==="XSUS_DURABLE_AUDIT_LOCKED")).toBe(true);
 }));
 it("does not initialize over corrupted existing state",async()=>fixture(async({make,directory})=>{
  const a=make();await a.initialize();
  await writeFile(join(directory,"audit.json"),"broken");
  await expect(a.initialize()).rejects.toMatchObject({code:"XSUS_DURABLE_AUDIT_CORRUPT"});
 }));
 it("preserves immutable entry metadata across process-local readers",async()=>fixture(async({make})=>{
  const a=make();await a.initialize();
  const entry=await a.append({kind:"verified",sequence:7});
  const snapshot=await make().read();
  expect(snapshot.entries[0].hash).toBe(entry.hash);
  expect(Object.isFrozen(snapshot.entries)).toBe(true);
  expect(Object.isFrozen(snapshot.entries[0])).toBe(true);
 }));
});
