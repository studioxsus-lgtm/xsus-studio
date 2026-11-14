import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createRecoveryDecisionAudit} from "../recovery-decision-audit.js";
import {createIncidentRecoveryIntegration} from "../incident-recovery-integration.js";
const tip="a".repeat(64);
const decision=(count=0)=>({
 verified:true,status:"ready",safeToResume:true,requiresManualReview:false,
 snapshot:{archive:{count,tip},checkpoint:{count,tip}},
 recommendedActions:[]
});
const make=(fn=async()=>decision(),maxEntries=1000)=>
 createRecoveryDecisionAudit({verifyRecoveryDecisions:fn,maxEntries});
describe("Hyper Audit v5.6 — recovery decision traceability",()=>{
 it("starts with an empty valid chain",()=>{
  const audit=make();
  expect(audit.verify()).toMatchObject({version:"5.6.0",valid:true,count:0});
  expect(audit.history()).toEqual([]);
 });
 it("records a verified decision with hash and immutable evidence",async()=>{
  const audit=make();const entry=await audit.record();
  expect(entry).toMatchObject({sequence:1,changed:false,status:"ready"});
  expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(Object.isFrozen(entry.snapshot.archive)).toBe(true);
  expect(Object.isFrozen(audit.history())).toBe(true);
 });
 it("chains identical checks without false changes",async()=>{
  const audit=make();const first=await audit.record(),second=await audit.record();
  expect(second.changed).toBe(false);
  expect(second.previousHash).toBe(first.hash);
  expect(audit.verify()).toMatchObject({valid:true,count:2,tip:second.hash});
 });
 it("detects authenticated snapshot changes",async()=>{
  let n=0;const audit=make(async()=>decision(n++));
  await audit.record();expect((await audit.record()).changed).toBe(true);
 });
 it("detects recommendation changes",async()=>{
  let n=0;const audit=make(async()=>{
   const base=decision();
   if(n++===0)return base;
   return {...base,status:"manual-intervention-required",safeToResume:false,
    requiresManualReview:true,recommendedActions:[{
     incidentCode:"FUTURE_BLOCKER",action:"ESCALATE_UNKNOWN_BLOCKER",
     priority:"high",requiresHumanApproval:true
    }]};
  });
  await audit.record();expect((await audit.record()).changed).toBe(true);
 });
 it("rejects malformed decisions without adding entries",async()=>{
  const audit=make(async()=>({...decision(),verified:false}));
  await expect(audit.record()).rejects.toMatchObject({code:"XSUS_RECOVERY_AUDIT_INVALID"});
  expect(audit.verify().count).toBe(0);
 });
 it("preserves earlier entries after a reader failure",async()=>{
  let n=0;const audit=make(async()=>{if(n++>0)throw Error("read failure");return decision();});
  await audit.record();await expect(audit.record()).rejects.toThrow("read failure");
  expect(audit.verify().count).toBe(1);
 });
 it("fails closed at capacity without evicting audit evidence",async()=>{
  const audit=make(undefined,2);
  await audit.record();await audit.record();
  await expect(audit.record()).rejects.toMatchObject({code:"XSUS_RECOVERY_AUDIT_FULL"});
  expect(audit.verify().count).toBe(2);
 });
 it("serializes concurrent recordings into one ordered hash chain",async()=>{
  const audit=make();const entries=await Promise.all(Array.from({length:40},()=>audit.record()));
  expect(entries.map(x=>x.sequence)).toEqual(Array.from({length:40},(_,i)=>i+1));
  expect(audit.verify()).toMatchObject({valid:true,count:40});
 });
 it("does not expose mutable history to callers",async()=>{
  const audit=make();await audit.record();
  const history=audit.history();
  expect(Object.isFrozen(history)).toBe(true);
  expect(Object.isFrozen(history[0])).toBe(true);
  expect(audit.verify().count).toBe(1);
 });
 it("keeps independent audit instances separate",async()=>{
  const first=make(),second=make();
  await first.record();expect(first.verify().count).toBe(1);
  expect(second.verify().count).toBe(0);
 });
 it("records real integration decisions without modifying checkpoint or pending residue",async()=>{
  const root=await mkdtemp(join(tmpdir(),"xsus-audit-v56-"));
  try{
   const r=createIncidentRecoveryIntegration({
    archiveDirectory:join(root,"archive"),checkpointDirectory:join(root,"checkpoint"),
    archiveKey:"a".repeat(48),checkpointKey:"b".repeat(48),
    archiveKeyId:"audit-archive",checkpointKeyId:"audit-checkpoint",
    authorize:async()=>true
   });
   await r.initializeCheckpoint();const before=await r.readCheckpoint();
   await r.recordRecoveryDecisionAudit();
   const pending=join(root,"checkpoint","checkpoint.pending");
   await writeFile(pending,"manual-review");
   const next=await r.recordRecoveryDecisionAudit();
   expect(next.changed).toBe(true);
   expect(r.listRecoveryDecisionAudit()).toHaveLength(2);
   expect(r.verifyRecoveryDecisionAudit()).toMatchObject({valid:true,count:2});
   expect(await readFile(pending,"utf8")).toBe("manual-review");
   expect(await r.readCheckpoint()).toEqual(before);
  }finally{await rm(root,{recursive:true,force:true});}
 });
});
