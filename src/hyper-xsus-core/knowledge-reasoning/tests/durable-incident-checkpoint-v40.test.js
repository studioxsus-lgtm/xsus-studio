import {describe,it,expect} from "vitest";
import {mkdtemp,rm,mkdir,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createDurableIncidentCheckpoint} from "../durable-incident-checkpoint.js";
const zero="0".repeat(64),a="a".repeat(64),b="b".repeat(64);
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"xsus-checkpoint-v4-"));
 const directory=join(root,"checkpoint");
 const make=(opts={})=>createDurableIncidentCheckpoint({directory,key:"k".repeat(48),keyId:"v4",...opts});
 try{await fn({directory,make});}finally{await rm(root,{recursive:true,force:true});}
}
describe("Hyper Audit v4.0 — durable authenticated checkpoint",()=>{
 it("rejects reading uninitialized state",async()=>fixture(async({make})=>{
  await expect(make().read()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_UNINITIALIZED"});
 }));
 it("initializes genesis checkpoint",async()=>fixture(async({make})=>{
  expect(await make().initialize()).toBe(true);
  expect(await make().read()).toEqual({count:0,tip:zero});
 }));
 it("initialization is idempotent",async()=>fixture(async({make})=>{
  await make().initialize();expect(await make().initialize()).toBe(false);
 }));
 it("advances authenticated checkpoint",async()=>fixture(async({make})=>{
  const c=make();await c.initialize();
  expect(await c.advance({count:0,tip:zero},{count:1,tip:a})).toEqual({count:1,tip:a});
 }));
 it("persists across recreated runtime",async()=>fixture(async({make})=>{
  await make().initialize();await make().advance({count:0,tip:zero},{count:2,tip:b});
  expect(await make().read()).toEqual({count:2,tip:b});
 }));
 it("rejects stale CAS",async()=>fixture(async({make})=>{
  const c=make();await c.initialize();await c.advance({count:0,tip:zero},{count:1,tip:a});
  await expect(c.advance({count:0,tip:zero},{count:2,tip:b})).rejects.toMatchObject({code:"XSUS_CHECKPOINT_CAS_CONFLICT"});
 }));
 it("rejects nonmonotonic update",async()=>fixture(async({make})=>{
  const c=make();await c.initialize();
  await expect(c.advance({count:0,tip:zero},{count:0,tip:zero})).rejects.toMatchObject({code:"XSUS_CHECKPOINT_INVALID_TRANSITION"});
 }));
 it("rejects malformed transition",async()=>fixture(async({make})=>{
  const c=make();await c.initialize();
  await expect(c.advance({count:0,tip:zero},{count:1,tip:"invalid"})).rejects.toMatchObject({code:"XSUS_CHECKPOINT_INVALID_TRANSITION"});
 }));
 it("detects checkpoint tampering",async()=>fixture(async({make,directory})=>{
  await make().initialize();const p=join(directory,"checkpoint.json");
  const data=JSON.parse(await readFile(p,"utf8"));data.count=9;
  await writeFile(p,JSON.stringify(data));
  await expect(make().read()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_SIGNATURE"});
 }));
 it("detects wrong key",async()=>fixture(async({make})=>{
  await make().initialize();
  await expect(make({key:"z".repeat(48)}).read()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_SIGNATURE"});
 }));
 it("detects wrong key id",async()=>fixture(async({make})=>{
  await make().initialize();
  await expect(make({keyId:"other"}).read()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_CORRUPT"});
 }));
 it("detects corrupt JSON",async()=>fixture(async({make,directory})=>{
  await make().initialize();await writeFile(join(directory,"checkpoint.json"),"{");
  await expect(make().read()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_CORRUPT"});
 }));
 it("does not reset corrupt checkpoint on initialize",async()=>fixture(async({make,directory})=>{
  await make().initialize();await writeFile(join(directory,"checkpoint.json"),"{");
  await expect(make().initialize()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_CORRUPT"});
 }));
 it("fails closed on stale lock",async()=>fixture(async({make,directory})=>{
  await mkdir(directory,{recursive:true});await mkdir(join(directory,"checkpoint.lock"));
  await expect(make().initialize()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_LOCKED"});
 }));
 it("fails closed on concurrent writer contention",async()=>fixture(async({make,directory})=>{
  await make().initialize();await mkdir(join(directory,"checkpoint.lock"));
  await expect(make().advance({count:0,tip:zero},{count:1,tip:a})).rejects.toMatchObject({code:"XSUS_CHECKPOINT_LOCKED"});
 }));
 it("rejects short key",async()=>fixture(async({directory})=>{
  expect(()=>createDurableIncidentCheckpoint({directory,key:"short",keyId:"v4"})).toThrow(TypeError);
 }));
 it("returns immutable checkpoints",async()=>fixture(async({make})=>{
  await make().initialize();expect(Object.isFrozen(await make().read())).toBe(true);
 }));
 it("supports 25 durable sequential CAS advances",async()=>fixture(async({make})=>{
  const c=make();await c.initialize();
  let previous={count:0,tip:zero};
  for(let i=1;i<=25;i++){
   const next={count:i,tip:i.toString(16).padStart(64,"0")};
   await c.advance(previous,next);previous=next;
  }
  expect(await make().read()).toEqual(previous);
 }));
});
