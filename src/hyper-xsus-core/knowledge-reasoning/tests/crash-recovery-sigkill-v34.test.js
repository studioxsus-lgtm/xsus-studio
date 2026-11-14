import {describe,it,expect} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawn} from "node:child_process";
import {once} from "node:events";
import {createLocalRecoveryBackend} from "../local-recovery-backend.js";
import {createCrashRecoveryAssessor} from "../crash-recovery-assessor.js";

const key="x".repeat(48);
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-sigkill-v34-"));
 const directory=join(root,"trusted");
 const create=()=>createLocalRecoveryBackend({directory,key,keyId:"crash-v34"});
 try{await fn({root,directory,create});}finally{await rm(root,{recursive:true,force:true});}
}
async function killChild(directory,action){
 const url=new URL("../local-recovery-backend.js",import.meta.url).href;
 const script=`import {createLocalRecoveryBackend} from ${JSON.stringify(url)};
 const b=createLocalRecoveryBackend({directory:process.env.XSUS_TEST_DIR,key:"x".repeat(48),keyId:"crash-v34"});
 const token=await b.lease.acquire();
 ${action==="commit"?"await b.highWater.advance(1,2,token);":""}
 process.stdout.write("READY\\n");setInterval(()=>{},1000);`;
 const child=spawn(process.execPath,["--input-type=module","-e",script],{
  env:{...process.env,XSUS_TEST_DIR:directory},stdio:["ignore","pipe","pipe"]
 });
 let stdout="",stderr="";
 child.stderr.on("data",b=>{stderr+=b;});
 await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error("Child readiness timeout: "+stderr)),10000);
  child.stdout.on("data",b=>{
   stdout+=b;
   if(stdout.includes("READY")){clearTimeout(timeout);resolve();}
  });
  child.once("exit",code=>{clearTimeout(timeout);reject(Error("Child exited before readiness: "+code+" "+stderr));});
 });
 child.kill("SIGKILL");
 const [code,signal]=await once(child,"exit");
 expect(signal).toBe("SIGKILL");
 return code;
}
describe("Hyper Audit v3.4 — real SIGKILL recovery inspection",()=>{
 it("detects orphaned lock after real SIGKILL without stealing it",async()=>{
  await fixture(async({directory,create})=>{
   const b=create();await b.initialize(1);
   await killChild(directory,"lock");
   const assessor=createCrashRecoveryAssessor({directory,highWater:b.highWater,expected:b.expected,
    receipts:{list:async()=>[]}});
   expect(await assessor.assess()).toMatchObject({status:"manual-lock-review",lock:"present",sequence:1});
   await expect(create().lease.acquire()).rejects.toMatchObject({code:"XSUS_AUDIT_FENCE_BUSY"});
  });
 });
 it("detects committed recovery missing receipt after real SIGKILL",async()=>{
  await fixture(async({directory,create})=>{
   const b=create();await b.initialize(1);
   await killChild(directory,"commit");
   expect(await create().highWater.read()).toBe(2);
   expect(await create().expected.read()).toEqual([2]);
   const assessor=createCrashRecoveryAssessor({directory,highWater:b.highWater,expected:b.expected,
    receipts:{list:async()=>[]}});
   expect(await assessor.assess()).toMatchObject({
    status:"manual-lock-review",missingReceipts:[2],sequence:2,integrityVerified:false
   });
  });
 });
 it("reports evidence gap without lock and never repairs automatically",async()=>{
  await fixture(async({directory,create})=>{
   const b=create();await b.initialize(1);
   const token=await b.lease.acquire();await b.highWater.advance(1,2,token);await b.lease.release(token);
   const assessor=createCrashRecoveryAssessor({directory,highWater:b.highWater,expected:b.expected,
    receipts:{list:async()=>[]}});
   expect(await assessor.assess()).toMatchObject({status:"evidence-incomplete",missingReceipts:[2]});
   expect(await b.highWater.read()).toBe(2);
  });
 });
});
