import {describe,it,expect} from "vitest";
import {spawn} from "node:child_process";
import {mkdtemp,rm,writeFile,readFile,mkdir,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableRecoveryAudit} from "../durable-recovery-audit.js";
import {createTrustedRecoveryAuditAnchor} from "../trusted-recovery-audit-anchor.js";
const anchorUrl=new URL("../trusted-recovery-audit-anchor.js",import.meta.url).href;
const auditUrl=new URL("../durable-recovery-audit.js",import.meta.url).href;
const options=(root,authorize=async()=>true)=>{
 const auditDirectory=join(root,"audit"),directory=join(root,"anchor");
 const auditConfig={directory:auditDirectory,key:"a".repeat(48),keyId:"v61-audit"};
 const audit=createDurableRecoveryAudit(auditConfig);
 const anchorConfig={directory,key:"b".repeat(48),keyId:"v61-anchor",auditDirectory,
  readDurableAudit:()=>audit.read(),authorize};
 return {audit,anchor:createTrustedRecoveryAuditAnchor(anchorConfig),auditConfig,anchorConfig,directory};
};
async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),"xsus-anchor-crash-v61-"));
 try{const x=options(root);await x.audit.initialize();await x.anchor.initialize();await run({...x,root});}
 finally{await rm(root,{recursive:true,force:true});}
}
async function killAtMarker(source,root,marker){
 const child=spawn(process.execPath,["--input-type=module","-e",source,root],{stdio:["ignore","pipe","pipe"]});
 let output="",errors="";
 let exited=false;
 const close=new Promise(resolve=>child.once("close",(code,signal)=>{exited=true;resolve({code,signal});}));
 const reached=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error("Timeout waiting for "+marker+"; "+errors)),15000);
  const finish=fn=>value=>{clearTimeout(timeout);fn(value);};
  child.stdout.on("data",chunk=>{output+=chunk.toString();if(output.includes(marker))finish(resolve)();});
  child.stderr.on("data",chunk=>{errors+=chunk.toString();});
  child.once("error",finish(reject));
  child.once("close",(code,signal)=>{if(!output.includes(marker))finish(reject)(Error("Child closed before marker "+code+" "+signal+" "+errors));});
 });
 try{
  await reached;
  expect(exited).toBe(false);
  expect(child.kill("SIGKILL")).toBe(true);
  expect((await close).signal).toBe("SIGKILL");
 }finally{
  if(!exited)child.kill("SIGKILL");
  await close;
 }
}
const worker=(body)=>[
 'import {createDurableRecoveryAudit} from '+JSON.stringify(auditUrl)+';',
 'import {createTrustedRecoveryAuditAnchor} from '+JSON.stringify(anchorUrl)+';',
 'import {join} from "node:path";',
 'const root=process.argv[1],auditDirectory=join(root,"audit"),directory=join(root,"anchor");',
 'const audit=createDurableRecoveryAudit({directory:auditDirectory,key:"a".repeat(48),keyId:"v61-audit"});',
 'const anchor=createTrustedRecoveryAuditAnchor({directory,key:"b".repeat(48),keyId:"v61-anchor",auditDirectory,readDurableAudit:()=>audit.read(),authorize:async()=>true});',
 body,
 'await new Promise(()=>{setInterval(()=>{},1000);});'
].join("\n");
describe("Hyper XSUS Core v6.1 — trusted anchor crash and reliability",()=>{
 it("survives five real SIGKILL events after committed anchor writes",async()=>fixture(async({audit,anchor,root})=>{
  for(let i=1;i<=5;i++){
   await audit.append({cycle:i});
   await killAtMarker(worker('await anchor.advance();process.stdout.write("COMMITTED\\n");'),root,"COMMITTED\n");
   const fresh=options(root);
   const state=await fresh.anchor.read();
   expect(state.count).toBe(i);
   expect((await fresh.anchor.assess()).safeToResume).toBe(true);
  }
 }),90000);
 it("retains prior anchor when killed before reviewer authorization",async()=>fixture(async({audit,anchor,root})=>{
  await audit.append({cycle:1});
  await killAtMarker(worker('const a=createTrustedRecoveryAuditAnchor({directory,key:"b".repeat(48),keyId:"v61-anchor",auditDirectory,readDurableAudit:()=>audit.read(),authorize:async()=>{process.stdout.write("REVIEW\\n");await new Promise(()=>{setInterval(()=>{},1000);});}});await a.advance();'),root,"REVIEW\n");
  expect((await anchor.read()).count).toBe(0);
  expect((await anchor.assess()).safeToResume).toBe(true);
 }),30000);
 it("blocks pending residue without replacing committed anchor",async()=>fixture(async({audit,anchor,directory})=>{
  await audit.append({cycle:1});
  const before=await anchor.read(),pending=join(directory,"checkpoint.pending");
  await writeFile(pending,"incomplete");
  await expect(anchor.advance()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_PENDING"});
  expect(await anchor.read()).toEqual(before);
  expect(await readFile(pending,"utf8")).toBe("incomplete");
 }));
 it("blocks anchor writer lock and preserves it",async()=>fixture(async({audit,anchor,directory})=>{
  await audit.append({cycle:1});
  const lock=join(directory,"checkpoint.lock");await mkdir(lock);
  const before=await stat(lock);
  await expect(anchor.advance()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_LOCKED"});
  expect((await stat(lock)).ino).toBe(before.ino);
  expect((await anchor.read()).count).toBe(0);
 }));
 it("rejects concurrent advancement without losing committed state",async()=>fixture(async({audit,anchor})=>{
  await audit.append({cycle:1});
  const results=await Promise.allSettled(Array.from({length:12},()=>anchor.advance()));
  expect(results.filter(x=>x.status==="fulfilled")).toHaveLength(1);
  expect(results.filter(x=>x.status==="rejected")).toHaveLength(11);
  expect((await anchor.read()).count).toBe(1);
 }));
 it("preserves monotonic anchor through 30 independent instances",async()=>fixture(async({audit,root})=>{
  for(let i=1;i<=30;i++){
   await audit.append({cycle:i});
   const fresh=options(root);
   expect((await fresh.anchor.advance()).count).toBe(i);
   expect((await options(root).anchor.read()).count).toBe(i);
  }
 }),90000);
 it("blocks audit rollback against separately stored anchor",async()=>fixture(async({audit,anchor,root})=>{
  await audit.append({cycle:1});
  const file=join(root,"audit","audit.json"),old=await readFile(file,"utf8");
  await audit.append({cycle:2});await anchor.advance();
  await writeFile(file,old);
  expect((await anchor.assess()).blockers).toContain("AUDIT_ROLLBACK_REVIEW_REQUIRED");
  await expect(anchor.advance()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_BLOCKED"});
 }));
 it("preserves signed anchor after unauthorized update attempts",async()=>fixture(async({audit,anchor,root})=>{
  await audit.append({cycle:1});await anchor.advance();
  const baseline=await readFile(join(root,"anchor","checkpoint.json"),"utf8");
  await audit.append({cycle:2});
  const denied=options(root,async()=>false);
  for(let i=0;i<10;i++)
   await expect(denied.anchor.advance()).rejects.toMatchObject({code:"XSUS_AUDIT_ANCHOR_DENIED"});
  expect(await readFile(join(root,"anchor","checkpoint.json"),"utf8")).toBe(baseline);
 }));
});
