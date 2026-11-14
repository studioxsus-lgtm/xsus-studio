import {describe,it,expect,vi} from "vitest";
import {createRecoveryLifecycle} from "../recovery-lifecycle-v818.js";
import {createTrustedCheckpointProtocol} from "../trusted-checkpoint-v815.js";
const ZERO="0".repeat(64),AKEY="a".repeat(40),CKEY="c".repeat(40);
function fixture(){
 const rows=[];
 let persisted;
 const checkpointStorage={
  readCheckpoint:async()=>structuredClone(persisted),
  compareAndSwap:async({expected,next})=>{
   if(persisted.signature!==expected.signature)return false;
   persisted=structuredClone(next);return true;
  }
 };
 const protocol=createTrustedCheckpointProtocol({
  key:CKEY,keyId:"checkpoint-v1",
  readCheckpoint:checkpointStorage.readCheckpoint,
  compareAndSwap:checkpointStorage.compareAndSwap
 });
 persisted=protocol.sign(0,ZERO);
 const auditStorage={
  list:async()=>structuredClone(rows),
  append:async row=>{
   const tip=rows.at(-1);
   if(row.sequence!==rows.length+1||
      row.previous_hash!==(tip?.entry_hash??ZERO))
    throw Error("CAS conflict");
   rows.push(structuredClone(row));return structuredClone(row);
  }
 };
 const build=()=>createRecoveryLifecycle({
  auditStorage,auditKey:AKEY,auditKeyId:"audit-v1",
  checkpointStorage,checkpointSigningKey:CKEY,
  checkpointKeyId:"checkpoint-v1"
 });
 return {build,rows,checkpointStorage,protocol,
  setCheckpoint:r=>{persisted=r;},getCheckpoint:()=>persisted};
}
describe("Hyper v8.1.8 complete recovery lifecycle",()=>{
 it("requires independent adapters",()=>{
  expect(()=>createRecoveryLifecycle()).toThrow(TypeError);
 });
 it("verifies genesis without authorizing recovery",async()=>{
  const x=fixture();
  expect(await x.build().inspect()).toMatchObject({
   verified:true,recoveryAuthorized:false,safeToResume:false});
 });
 it("writes, reviews, advances, and verifies after fresh instance restart",async()=>{
  const x=fixture();
  const result=await x.build().appendAndReview({
   payload:{kind:"audit"},authorize:async()=>true
  });
  expect(result).toMatchObject({status:"verified",count:1,
   recoveryAuthorized:false,safeToResume:false});
  expect(await x.build().inspect()).toMatchObject({verified:true,count:1});
 });
 it("requires a reviewer before writing",async()=>{
  const x=fixture();
  await expect(x.build().appendAndReview({payload:{a:1}}))
   .rejects.toMatchObject({code:"XSUS_LIFECYCLE_REVIEW_REQUIRED"});
  expect(x.rows).toHaveLength(0);
 });
 it("denies unapproved writes",async()=>{
  const x=fixture();
  await expect(x.build().appendAndReview({
   payload:{a:1},authorize:async()=>false
  })).rejects.toMatchObject({code:"XSUS_LIFECYCLE_REVIEW_DENIED"});
  expect(x.rows).toHaveLength(0);
 });
 it("fails closed if reviewer revokes approval after write",async()=>{
  const x=fixture();
  const authorize=vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await expect(x.build().appendAndReview({payload:{a:1},authorize}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_REVIEW_DENIED"});
  expect(x.rows).toHaveLength(1);
  expect((await x.build().inspect()).verified).toBe(false);
 });
 it("detects tampered payload after restart",async()=>{
  const x=fixture();
  await x.build().appendAndReview({payload:{a:1},authorize:async()=>true});
  x.rows[0].payload={a:999};
  expect((await x.build().inspect()).verified).toBe(false);
 });
 it("detects truncated audit after restart",async()=>{
  const x=fixture();
  await x.build().appendAndReview({payload:{a:1},authorize:async()=>true});
  x.rows.length=0;
  expect((await x.build().inspect()).verified).toBe(false);
 });
 it("detects forged checkpoint after restart",async()=>{
  const x=fixture();
  await x.build().appendAndReview({payload:{a:1},authorize:async()=>true});
  x.setCheckpoint({...x.getCheckpoint(),count:7});
  expect((await x.build().inspect()).verified).toBe(false);
 });
 it("supports sequential reviewed cycles",async()=>{
  const x=fixture();
  await x.build().appendAndReview({payload:{n:1},authorize:async()=>true});
  await x.build().appendAndReview({payload:{n:2},authorize:async()=>true});
  expect(await x.build().inspect()).toMatchObject({verified:true,count:2});
 });
 it("does not leak either signing key",async()=>{
  const x=fixture();
  const report=await x.build().appendAndReview({
   payload:{a:1},authorize:async()=>true
  });
  expect(JSON.stringify(report)).not.toContain(AKEY);
  expect(JSON.stringify(report)).not.toContain(CKEY);
 });
});
