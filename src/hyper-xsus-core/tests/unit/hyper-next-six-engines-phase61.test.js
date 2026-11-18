import {describe,it,expect} from "vitest";
import {mkdtemp,rm,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {authenticateReviewAuditChain} from "../../next-engines/orchestration/review-authenticated-audit-chain.js";
import {createPersistentReviewReplayGuard} from "../../next-engines/orchestration/review-persistent-replay-guard.js";
const key=Buffer.alloc(32,4);
const snapshot=()=>({state:"manual_review_only",executionAuthorized:false,
 retrySafe:false,sideEffects:false,results:[{requestId:"r",traceId:"t",
 assessment:{state:"review_blocked",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"}}]});
const observations=(id="a")=>[{sequence:1,observationId:id,snapshot:snapshot()},
 {sequence:2,observationId:"b"+id,snapshot:snapshot()}];
const receipt=items=>authenticateReviewAuditChain({observations:items,key,keyId:"current"});
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase61-"));
 try{return await fn(join(dir,"replay.json"));}
 finally{await rm(dir,{recursive:true,force:true});}};
const guard=(filePath,options={})=>createPersistentReviewReplayGuard({
 filePath,keys:{current:key},activeKeyId:"current",...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 61 — persistent replay registry",()=>{
 it("persists a receipt across guard recreation",async()=>fixture(async filePath=>{
  const items=observations(),signed=receipt(items);
  expect((await guard(filePath).verify({observations:items,receipt:signed})).state)
   .toBe("authenticated_for_manual_review");
  const replay=await guard(filePath).verify({observations:items,receipt:signed});
  expect(replay.findings).toContain("RECEIPT_REPLAYED");denied(replay);
 }));
 it("serializes concurrent acceptance without duplicate success",async()=>fixture(async filePath=>{
  const items=observations(),signed=receipt(items),g=guard(filePath);
  const results=await Promise.all([g.verify({observations:items,receipt:signed}),
   g.verify({observations:items,receipt:signed})]);
  expect(results.filter(x=>x.state==="authenticated_for_manual_review")).toHaveLength(1);
  expect(results.every(x=>x.executionAuthorized===false)).toBe(true);
 }));
 it("blocks corrupted registry without overwriting it",async()=>fixture(async filePath=>{
  await writeFile(filePath,"{broken","utf8");
  const items=observations(),result=await guard(filePath).verify({
   observations:items,receipt:receipt(items)});
  expect(result.findings).toContain("PERSISTENT_REPLAY_UNVERIFIED");
  expect(await readFile(filePath,"utf8")).toBe("{broken");denied(result);
 }));
 it("fails closed when the registry is full",async()=>fixture(async filePath=>{
  const g=guard(filePath,{maxReceipts:1}),a=observations("a"),b=observations("c");
  expect((await g.verify({observations:a,receipt:receipt(a)})).state)
   .toBe("authenticated_for_manual_review");
  const result=await g.verify({observations:b,receipt:receipt(b)});
  expect(result.findings).toContain("REPLAY_REGISTRY_FULL");denied(result);
 }));
 it("does not persist invalid signatures",async()=>fixture(async filePath=>{
  const items=observations(),signed={...receipt(items),authenticationTag:"0".repeat(64)};
  const result=await guard(filePath).verify({observations:items,receipt:signed});
  expect(result.state).toBe("authentication_blocked");denied(result);
  const accepted=await guard(filePath).verify({observations:items,receipt:receipt(items)});
  expect(accepted.state).toBe("authenticated_for_manual_review");
 }));
});
