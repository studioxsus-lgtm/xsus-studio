import {describe,it,expect} from "vitest";
import {createTrustedCheckpointProtocol} from "../trusted-checkpoint-v815.js";
const ZERO="0".repeat(64),TIP="a".repeat(64),KEY="c".repeat(40);
function fixture(){
 let stored;
 const protocol=createTrustedCheckpointProtocol({
  key:KEY,keyId:"checkpoint-v1",
  readCheckpoint:async()=>stored,
  compareAndSwap:async({expected,next})=>{
   if(!stored||stored.signature!==expected.signature)return false;
   stored=next;return true;
  }
 });
 stored=protocol.sign(0,ZERO);
 return {protocol,get:()=>stored,set:x=>{stored=x;}};
}
describe("Hyper XSUS Core v8.1.5 trusted checkpoint protocol",()=>{
 it("requires independent credentials and storage",()=>{
  expect(()=>createTrustedCheckpointProtocol()).toThrow(TypeError);
 });
 it("reads a signed genesis checkpoint",async()=>{
  const x=fixture();
  expect(await x.protocol.read()).toMatchObject({count:0,tip:ZERO});
 });
 it("rejects altered checkpoint hashes",async()=>{
  const x=fixture();
  x.set({...x.get(),tip:TIP});
  await expect(x.protocol.read()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_INVALID"});
 });
 it("rejects altered checkpoint counts",async()=>{
  const x=fixture();
  x.set({...x.get(),count:2});
  await expect(x.protocol.read()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_INVALID"});
 });
 it("rejects wrong key IDs",async()=>{
  const x=fixture();
  x.set({...x.get(),keyId:"other"});
  await expect(x.protocol.read()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_INVALID"});
 });
 it("rejects missing persisted checkpoints",async()=>{
  const x=fixture();x.set(null);
  await expect(x.protocol.read()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_INVALID"});
 });
 it("advances only one verified audit step",async()=>{
  const x=fixture(),expected=await x.protocol.read(),next=x.protocol.sign(1,TIP);
  expect(await x.protocol.advance({expected,next,
   verifiedAudit:{verified:true,count:1,tip:TIP}})).toMatchObject({
    count:1,tip:TIP,recoveryAuthorized:false});
 });
 it("rejects unverified audit evidence",async()=>{
  const x=fixture(),expected=await x.protocol.read(),next=x.protocol.sign(1,TIP);
  await expect(x.protocol.advance({expected,next,
   verifiedAudit:{verified:false,count:1,tip:TIP}}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_ADVANCE_DENIED"});
 });
 it("rejects multi-step jumps",async()=>{
  const x=fixture(),expected=await x.protocol.read(),next=x.protocol.sign(2,TIP);
  await expect(x.protocol.advance({expected,next,
   verifiedAudit:{verified:true,count:2,tip:TIP}}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_ADVANCE_DENIED"});
 });
 it("rejects stale checkpoints",async()=>{
  const x=fixture(),expected=await x.protocol.read(),next=x.protocol.sign(1,TIP);
  x.set(x.protocol.sign(1,TIP));
  await expect(x.protocol.advance({expected,next,
   verifiedAudit:{verified:true,count:1,tip:TIP}}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_CONFLICT"});
 });
 it("detects failed CAS",async()=>{
  const x=fixture(),expected=await x.protocol.read(),next=x.protocol.sign(1,TIP);
  const p=createTrustedCheckpointProtocol({key:KEY,keyId:"checkpoint-v1",
   readCheckpoint:async()=>x.get(),compareAndSwap:async()=>false});
  await expect(p.advance({expected,next,
   verifiedAudit:{verified:true,count:1,tip:TIP}}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_CONFLICT"});
 });
 it("detects unconfirmed persistence",async()=>{
  const x=fixture(),expected=await x.protocol.read(),next=x.protocol.sign(1,TIP);
  const p=createTrustedCheckpointProtocol({key:KEY,keyId:"checkpoint-v1",
   readCheckpoint:async()=>x.get(),compareAndSwap:async()=>true});
  await expect(p.advance({expected,next,
   verifiedAudit:{verified:true,count:1,tip:TIP}}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_UNCONFIRMED"});
 });
 it("never exposes the signing key",async()=>{
  const x=fixture();
  expect(JSON.stringify(await x.protocol.read())).not.toContain(KEY);
 });
});
