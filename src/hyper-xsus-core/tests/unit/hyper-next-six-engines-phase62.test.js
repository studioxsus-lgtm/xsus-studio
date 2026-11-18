import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile,symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {authenticateReviewAuditChain} from "../../next-engines/orchestration/review-authenticated-audit-chain.js";
import {createPersistentReviewReplayGuard} from "../../next-engines/orchestration/review-persistent-replay-guard.js";
const key=Buffer.alloc(32,9);
const snapshot=()=>({state:"manual_review_only",executionAuthorized:false,
 retrySafe:false,sideEffects:false,results:[{requestId:"r",traceId:"t",
 assessment:{state:"review_blocked",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"}}]});
const observations=()=>[{sequence:1,observationId:"a",snapshot:snapshot()},
 {sequence:2,observationId:"b",snapshot:snapshot()}];
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase62-"));
 try{return await fn(join(dir,"replay.json"),dir);}
 finally{await rm(dir,{recursive:true,force:true});}};
const guard=filePath=>createPersistentReviewReplayGuard({filePath,
 keys:{current:key},activeKeyId:"current"});
const request=()=>{const items=observations();return {observations:items,
 receipt:authenticateReviewAuditChain({observations:items,key,keyId:"current"})};};
const denied=result=>expect(result).toMatchObject({state:"authentication_blocked",
 recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false,
 executionAuthorized:false,sideEffects:false});
describe("Hyper phase 62 — persistent replay integrity",()=>{
 it("rejects modified registry content without overwriting it",async()=>fixture(async filePath=>{
  expect((await guard(filePath).verify(request())).state).toBe("authenticated_for_manual_review");
  const data=JSON.parse(await readFile(filePath,"utf8"));data.ids[0]="f".repeat(64);
  const tampered=JSON.stringify(data);await writeFile(filePath,tampered);
  denied(await guard(filePath).verify(request()));
  expect(await readFile(filePath,"utf8")).toBe(tampered);
 }));
 it("rejects a symbolic link registry without modifying its target",async()=>fixture(async(filePath,dir)=>{
  const target=join(dir,"target.json");await writeFile(target,"sensitive");
  await symlink(target,filePath);
  denied(await guard(filePath).verify(request()));
  expect(await readFile(target,"utf8")).toBe("sensitive");
 }));
 it("blocks unresolved temporary writes and leaves them for investigation",async()=>fixture(async filePath=>{
  await writeFile(filePath+".interrupted.tmp","incomplete");
  denied(await guard(filePath).verify(request()));
  expect(await readFile(filePath+".interrupted.tmp","utf8")).toBe("incomplete");
 }));
 it("preserves successful replay detection with digest-checked registry",async()=>fixture(async filePath=>{
  const g=guard(filePath),req=request();
  expect((await g.verify(req)).state).toBe("authenticated_for_manual_review");
  const saved=JSON.parse(await readFile(filePath,"utf8"));
  expect(saved.digest).toMatch(/^[a-f0-9]{64}$/);
  expect((await guard(filePath).verify(req)).findings).toContain("RECEIPT_REPLAYED");
 }));
 it("rejects a truncated registry without reinitializing it",async()=>fixture(async filePath=>{
  await writeFile(filePath,'{"version":1,"ids":[');
  denied(await guard(filePath).verify(request()));
  expect(await readFile(filePath,"utf8")).toBe('{"version":1,"ids":[');
 }));
});
