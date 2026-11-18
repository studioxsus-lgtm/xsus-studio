import {describe,it,expect} from "vitest";
import {mkdtemp,writeFile,readFile,symlink,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {inspectReviewLock} from "../../next-engines/orchestration/review-lock-recovery.js";
import {withExclusiveFileLock} from "../../knowledge-graph/integration/exclusive-file-lock.js";
const fixture=async fn=>{const dir=await mkdtemp(join(tmpdir(),"xsus-phase40-"));
 try{return await fn(join(dir,"journal.json"),dir);}
 finally{await rm(dir,{recursive:true,force:true});}};
const denied=result=>{
 expect(result).toMatchObject({recoveryAuthorized:false,deletionAuthorized:false,retrySafe:false});
};
describe("Hyper phase 40 — read-only lock recovery inspection",()=>{
 it("reports missing lock without treating it as safe to retry",async()=>fixture(async path=>{
  const result=await inspectReviewLock({filePath:path});
  expect(result).toMatchObject({state:"not_observed",lockPresent:false,nextAction:"verify_journal"});
  denied(result);
 }));
 it("observes a real owned lock without releasing it",async()=>fixture(async path=>{
  await withExclusiveFileLock(path,async()=>{
   const before=await readFile(path+".lock","utf8");
   const result=await inspectReviewLock({filePath:path});
   expect(result).toMatchObject({state:"lock_observed",lockPresent:true,ownerPid:process.pid});
   denied(result);
   expect(await readFile(path+".lock","utf8")).toBe(before);
  });
 }));
 it("refuses malformed metadata and leaves bytes unchanged",async()=>fixture(async path=>{
  await writeFile(path+".lock","{broken");
  const result=await inspectReviewLock({filePath:path});
  expect(result.state).toBe("unverifiable_lock");denied(result);
  expect(await readFile(path+".lock","utf8")).toBe("{broken");
 }));
 it("rejects a symlink lock without reading its target",async()=>fixture(async(path,dir)=>{
  const target=join(dir,"target");
  await writeFile(target,JSON.stringify({pid:process.pid,token:randomUUID()}));
  await symlink(target,path+".lock");
  const result=await inspectReviewLock({filePath:path});
  expect(result.state).toBe("unsafe_lock");denied(result);
  expect(await readFile(target,"utf8")).toContain("token");
 }));
 it("rejects oversized metadata without changing the lock",async()=>fixture(async path=>{
  const raw="x".repeat(5000);
  await writeFile(path+".lock",raw);
  const result=await inspectReviewLock({filePath:path});
  expect(result.state).toBe("unverifiable_lock");denied(result);
  expect(await readFile(path+".lock","utf8")).toBe(raw);
 }));
 it("does not trust a forged PID with an invalid ownership token",async()=>fixture(async path=>{
  await writeFile(path+".lock",JSON.stringify({pid:process.pid,token:"forged"}));
  const result=await inspectReviewLock({filePath:path});
  expect(result.state).toBe("unverifiable_lock");denied(result);
 }));
});
