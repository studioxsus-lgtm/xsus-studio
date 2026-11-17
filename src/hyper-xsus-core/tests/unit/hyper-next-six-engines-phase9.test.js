import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {promisify} from "node:util";
import {execFile} from "node:child_process";
import {fileURLToPath} from "node:url";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {createPersistentDecisionJournalStore} from "../../next-engines/orchestration/persistent-decision-journal.js";
const exec=promisify(execFile);
const storeModule=fileURLToPath(new URL("../../next-engines/orchestration/persistent-decision-journal.js",import.meta.url));
const coordinatorModule=fileURLToPath(new URL("../../next-engines/orchestration/index.js",import.meta.url));
function request(traceId="trace-1"){return {contractVersion:"1.0.0",requestId:"same-id",engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{truth:{claim:"Example",evidence:[]}}},context:{principalId:"tester",traceId,authorizationRef:"policy:test"}};}
async function fixture(run){const dir=await mkdtemp(join(tmpdir(),"xsus-phase9-"));try{await run(join(dir,"journal.json"));}finally{await rm(dir,{recursive:true,force:true});}}
const workerCode=`
import {createPersistentDecisionJournalStore} from process.argv[1];
`;
const script=`
const {createPersistentDecisionJournalStore}=await import(process.argv[1]);
const {coordinateSixEngines}=await import(process.argv[2]);
const filePath=process.argv[3],mode=process.argv[4];
const store=createPersistentDecisionJournalStore({filePath});
if(mode==="save"){
 const response=coordinateSixEngines({contractVersion:"1.0.0",requestId:"cross-process",engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs:{truth:{claim:"X",evidence:[]}}},context:{principalId:"worker",traceId:"cross-trace",authorizationRef:"policy:test"}});
 await store.save(response);process.stdout.write("SAVED");
}else{
 const restored=await store.load();
 process.stdout.write(JSON.stringify({requestId:restored?.journal.requestId,executionAuthorized:restored?.executionAuthorized,checkpoint:restored?.checkpoint.nextAction}));
}
`;
async function worker(filePath,mode){return exec(process.execPath,["--input-type=module","-e",script,storeModule,coordinatorModule,filePath,mode],{timeout:20000});}
describe("Hyper six engines phase 9 — cross-process persistence",()=>{
 it("rejects same request ID with changed trace identity",async()=>fixture(async filePath=>{
  const store=createPersistentDecisionJournalStore({filePath});
  await store.save(coordinateSixEngines(request("trace-original")));
  const before=await readFile(filePath,"utf8");
  await expect(store.save(coordinateSixEngines(request("trace-forged")))).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
  expect(await readFile(filePath,"utf8")).toBe(before);
 }));
 it("writes in one process and restores in another",async()=>fixture(async filePath=>{
  const saved=await worker(filePath,"save");expect(saved.stdout).toBe("SAVED");
  const restored=await worker(filePath,"load");
  expect(JSON.parse(restored.stdout)).toEqual({requestId:"cross-process",executionAuthorized:false,checkpoint:"manual_review"});
 }));
 it("keeps identical cross-process saves idempotent",async()=>fixture(async filePath=>{
  await worker(filePath,"save");
  const before=await readFile(filePath,"utf8");
  await worker(filePath,"save");
  expect(await readFile(filePath,"utf8")).toBe(before);
 }));
 it("rejects cross-process request overwrite without touching bytes",async()=>fixture(async filePath=>{
  await worker(filePath,"save");
  const before=await readFile(filePath,"utf8");
  const store=createPersistentDecisionJournalStore({filePath});
  await expect(store.save(coordinateSixEngines(request()))).rejects.toMatchObject({code:"JOURNAL_CONFLICT"});
  expect(await readFile(filePath,"utf8")).toBe(before);
 }));
});
