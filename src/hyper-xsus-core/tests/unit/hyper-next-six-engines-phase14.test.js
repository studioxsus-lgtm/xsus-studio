import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {createDecisionJournal,replayDecisionJournal} from "../../next-engines/orchestration/decision-journal.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
const req=(inputs)=>({contractVersion:"1.0.0",requestId:"phase14",engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs},context:{principalId:"test",traceId:"trace14",authorizationRef:"policy:test"}});
const response=()=>coordinateSixEngines(req({truth:{claim:"X",evidence:[]},learning:{content:"",sourceRef:"s"},execution:{}}));
const journal=()=>createDecisionJournal(response());
const checksum=payload=>createHash("sha256").update(JSON.stringify(payload)).digest("hex");
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),"xsus-phase14-"));try{await fn(join(dir,"journal.json"));}finally{await rm(dir,{recursive:true,force:true});}}
describe("Hyper six engines phase 14 — semantic integrity",()=>{
 it("accepts the canonical journal",()=>expect(replayDecisionJournal(journal())).toMatchObject({completed:3,executionAuthorized:false}));
 it("rejects reordered stages",()=>{
  const j=journal();const entries=[...j.entries].reverse().map((e,i)=>({...e,sequence:i+1}));
  expect(()=>replayDecisionJournal({...j,entries})).toThrow();
 });
 it("rejects a success entry with an error code",()=>{
  const j=journal();const entries=j.entries.map((e,i)=>i===0?{...e,code:"FORGED"}:e);
  expect(()=>replayDecisionJournal({...j,entries})).toThrow();
 });
 it("rejects an invalid rejection code",()=>{
  const j=journal();const entries=j.entries.map(e=>e.status==="rejected"?{...e,code:42}:e);
  expect(()=>replayDecisionJournal({...j,entries})).toThrow();
 });
 it("rejects mismatched orchestration counters",()=>{
  const r=response();r.result.completed=100;
  expect(()=>createDecisionJournal(r)).toThrow();
 });
 it("rejects a forged orchestration state",()=>{
  const r=response();r.result.state="approved";
  expect(()=>createDecisionJournal(r)).toThrow();
 });
 it("rejects out-of-order response stages",()=>{
  const r=response();r.result.stages.reverse();
  expect(()=>createDecisionJournal(r)).toThrow();
 });
 it("rejects semantically altered snapshot even if checksum is recomputed",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  await store.save(response());
  const envelope=JSON.parse(await readFile(filePath,"utf8"));
  envelope.payload.journal.entries.reverse();
  envelope.payload.journal.entries=envelope.payload.journal.entries.map((e,i)=>({...e,sequence:i+1}));
  envelope.digest=checksum(envelope.payload);
  await writeFile(filePath,JSON.stringify(envelope));
  await expect(store.load()).rejects.toMatchObject({code:"INVALID_INPUT"});
 }));
 it("rejects a checkpoint counter mismatch even with recomputed checksum",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  await store.save(response());
  const envelope=JSON.parse(await readFile(filePath,"utf8"));
  envelope.payload.checkpoint.completed=99;
  envelope.digest=checksum(envelope.payload);
  await writeFile(filePath,JSON.stringify(envelope));
  await expect(store.load()).rejects.toMatchObject({code:"CHECKPOINT_MISMATCH"});
 }));
});
