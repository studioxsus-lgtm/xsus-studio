import {describe,it,expect} from "vitest";
import {spawn} from "node:child_process";
import {mkdtemp,rm,readFile,writeFile,readdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createRotatingAuditAnchors} from "../audit-anchor-rotation.js";
import {createFencedAuditCoordinator} from "../fenced-audit-coordinator.js";

const rotationUrl=new URL("../audit-anchor-rotation.js",import.meta.url).href;
const key="v".repeat(48),keyId="crash-test";
const h=c=>c.repeat(64);
const snap=(n,hash,entries=[{sequence:n,hash}],anchorHash="GENESIS")=>({
 version:"0.8.0",lastSequence:n,anchorHash,entries
});
const worker=[
 'import {createRotatingAuditAnchors} from '+JSON.stringify(rotationUrl)+';',
 'const store=createRotatingAuditAnchors({directory:process.argv[1],key:'+JSON.stringify(key)+',keyId:'+JSON.stringify(keyId)+'});',
 'const snapshot=JSON.parse(process.argv[2]);',
 'await store.rotate(snapshot);',
 'process.stdout.write("ANCHOR_DURABLE\\n");',
 'setInterval(()=>{},1000);'
].join("\n");
async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),"xsus-fenced-crash-v22-"));
 try{await fn(join(dir,"anchors"),join(dir,"mark.json"));}
 finally{await rm(dir,{recursive:true,force:true});}
}
function store(directory){return createRotatingAuditAnchors({directory,key,keyId});}
async function crashAfterAnchor(directory,snapshot){
 const child=spawn(process.execPath,["--input-type=module","-e",worker,directory,JSON.stringify(snapshot)],
  {stdio:["ignore","pipe","pipe"]});
 let output="",stderr="",settled=false;
 const ready=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>finish(new Error("Worker timed out: "+stderr)),15000);
  function finish(e){if(settled)return;settled=true;clearTimeout(timeout);e?reject(e):resolve();}
  child.stdout.on("data",b=>{output+=b.toString();if(output.includes("ANCHOR_DURABLE\n"))finish();});
  child.stderr.on("data",b=>{stderr+=b.toString();});
  child.once("error",finish);
  child.once("exit",(code,signal)=>finish(new Error("Worker exited before marker: "+code+" "+signal+" "+stderr)));
 });
 try{
  await ready;
  const closed=new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error("SIGKILL close timeout")),10000);
   child.once("close",(code,signal)=>{clearTimeout(timeout);resolve({code,signal});});
  });
  expect(child.kill("SIGKILL")).toBe(true);
  expect((await closed).signal).toBe("SIGKILL");
 }finally{
  if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
 }
}
function coordinator(directory,markFile){
 const anchors=store(directory);
 const highWater={
  read:async()=>JSON.parse(await readFile(markFile,"utf8")).sequence,
  advance:async()=>{throw Error("Not a production CAS backend");}
 };
 const lease={acquire:async()=>1,release:async()=>{}};
 return createFencedAuditCoordinator({anchors,highWater,lease});
}
describe("Hyper Audit v2.2.0 — real child-process crash boundaries",()=>{
 it("SIGKILL after durable anchor creates a detectable pending state",async()=>{
  await fixture(async(directory,markFile)=>{
   const first=snap(1,h("a"));
   await store(directory).rotate(first);
   await writeFile(markFile,JSON.stringify({sequence:1}));
   const second=snap(2,h("b"),[{sequence:1,hash:h("a")},{sequence:2,hash:h("b")}]);
   await crashAfterAnchor(directory,second);
   expect(await store(directory).list()).toEqual([1,2]);
   await expect(coordinator(directory,markFile).inspect(second))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_PENDING"});
  });
 },60000);
 it("fresh process verifies committed anchor without false recovery",async()=>{
  await fixture(async(directory,markFile)=>{
   const first=snap(1,h("a"));
   await store(directory).rotate(first);
   await writeFile(markFile,JSON.stringify({sequence:1}));
   expect(await coordinator(directory,markFile).inspect(first))
    .toEqual({sequence:1,status:"verified"});
  });
 });
 it("detects deletion of highest committed anchor after restart",async()=>{
  await fixture(async(directory,markFile)=>{
   const first=snap(1,h("a"));
   await store(directory).rotate(first);
   await writeFile(markFile,JSON.stringify({sequence:2}));
   await expect(coordinator(directory,markFile).inspect(first))
    .rejects.toMatchObject({code:"XSUS_ANCHOR_DELETION"});
  });
 });
});
