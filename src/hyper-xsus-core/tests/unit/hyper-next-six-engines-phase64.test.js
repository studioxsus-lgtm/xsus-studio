import {describe,it,expect} from "vitest";
import {mkdtemp,rm,readFile,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {createAnchoredReplayPreflight} from "../../next-engines/orchestration/review-anchored-replay-preflight.js";
import {createReviewReplayRollbackAnchor} from "../../next-engines/orchestration/review-replay-rollback-anchor.js";
const key=Buffer.alloc(32,17);
const digest=ids=>createHash("sha256").update(JSON.stringify([1,ids])).digest("hex");
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase64-"));
 try{return await fn(join(dir,"registry.json"));}
 finally{await rm(dir,{recursive:true,force:true});}};
const setup=async filePath=>{
 const ids=["a".repeat(64)],registryDigest=digest(ids);
 await writeFile(filePath,JSON.stringify({version:1,ids,digest:registryDigest}));
 return {registryDigest,anchor:createReviewReplayRollbackAnchor({
  version:5,digest:registryDigest,key})};
};
const preflight=(filePath,anchorProvider,options={})=>createAnchoredReplayPreflight({
 filePath,anchorProvider,key,minimumSequence:5,...options});
const denied=x=>expect(x).toMatchObject({recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,sideEffects:false});
describe("Hyper phase 64 — anchored replay preflight",()=>{
 it("verifies trusted anchor and registry without modifying bytes",async()=>fixture(async filePath=>{
  const {anchor}=await setup(filePath),before=await readFile(filePath,"utf8");
  const result=await preflight(filePath,async()=>anchor).inspect();
  expect(result).toMatchObject({state:"anchored_replay_observed",receiptCount:1});
  denied(result);expect(await readFile(filePath,"utf8")).toBe(before);
 }));
 it("blocks absent independent anchor",async()=>fixture(async filePath=>{
  await setup(filePath);
  const result=await preflight(filePath,async()=>null).inspect();
  expect(result.state).toBe("anchored_replay_blocked");denied(result);
 }));
 it("detects changed registry after anchor creation",async()=>fixture(async filePath=>{
  const {anchor}=await setup(filePath);
  await writeFile(filePath,JSON.stringify({version:1,ids:[],digest:digest([])}));
  const result=await preflight(filePath,async()=>anchor).inspect();
  expect(result.findings).toContain("REGISTRY_ROLLBACK_OR_TAMPERING");denied(result);
 }));
 it("blocks an interrupted write without deleting its temp file",async()=>fixture(async filePath=>{
  const {anchor}=await setup(filePath);
  await writeFile(filePath+".crash.tmp","pending");
  const result=await preflight(filePath,async()=>anchor).inspect();
  expect(result.findings).toContain("INTERRUPTED_REGISTRY_WRITE");
  expect(await readFile(filePath+".crash.tmp","utf8")).toBe("pending");
 }));
 it("fails closed when anchor provider throws",async()=>fixture(async filePath=>{
  await setup(filePath);
  const result=await preflight(filePath,async()=>{throw Error("offline");}).inspect();
  expect(result.findings).toContain("ANCHORED_PREFLIGHT_UNVERIFIED");denied(result);
 }));
 it("rejects missing registry instead of bootstrapping one",async()=>fixture(async filePath=>{
  const result=await preflight(filePath,async()=>null).inspect();
  expect(result.state).toBe("anchored_replay_blocked");denied(result);
 }));
});
