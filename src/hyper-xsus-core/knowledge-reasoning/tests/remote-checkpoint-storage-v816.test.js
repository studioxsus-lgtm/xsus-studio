import {describe,it,expect,vi} from "vitest";
import {createRemoteCheckpointStorage} from "../remote-checkpoint-storage-v816.js";
const Z="0".repeat(64),A="a".repeat(64),B="b".repeat(64);
const first={count:0,tip:Z,signature:A,keyId:"checkpoint-v1"};
const second={count:1,tip:B,signature:B,keyId:"checkpoint-v1"};
function setup(value=[first],ok=true){
 const fetchImpl=vi.fn(async()=>({ok,json:async()=>value}));
 return {storage:createRemoteCheckpointStorage({
  url:"https://independent.supabase.co",key:"secret-server-key",fetchImpl}),fetchImpl};
}
describe("Hyper v8.1.6 remote checkpoint CAS transport",()=>{
 it("requires a trusted endpoint",()=>{
  expect(()=>createRemoteCheckpointStorage()).toThrow(TypeError);
 });
 it("reads one durable checkpoint",async()=>{
  const x=setup();
  expect(await x.storage.readCheckpoint()).toEqual(first);
 });
 it("rejects missing checkpoint",async()=>{
  const x=setup([]);
  await expect(x.storage.readCheckpoint()).rejects.toMatchObject({
   code:"XSUS_CHECKPOINT_STORAGE_INVALID_RESPONSE"});
 });
 it("rejects duplicate checkpoints",async()=>{
  const x=setup([first,first]);
  await expect(x.storage.readCheckpoint()).rejects.toMatchObject({
   code:"XSUS_CHECKPOINT_STORAGE_INVALID_RESPONSE"});
 });
 it("rejects malformed checkpoint",async()=>{
  const x=setup([{...first,tip:"bad"}]);
  await expect(x.storage.readCheckpoint()).rejects.toMatchObject({
   code:"XSUS_CHECKPOINT_STORAGE_INVALID_RESPONSE"});
 });
 it("calls atomic CAS RPC with expected and next records",async()=>{
  const x=setup(true);
  expect(await x.storage.compareAndSwap({expected:first,next:second})).toBe(true);
  const [url,opts]=x.fetchImpl.mock.calls[0];
  expect(url).toContain("/rpc/xsus_hyper_checkpoint_cas_v816");
  expect(JSON.parse(opts.body).p_expected_signature).toBe(first.signature);
 });
 it("returns CAS conflict without retrying",async()=>{
  const x=setup(false);
  expect(await x.storage.compareAndSwap({expected:first,next:second})).toBe(false);
  expect(x.fetchImpl).toHaveBeenCalledTimes(1);
 });
 it("rejects non-boolean CAS result",async()=>{
  const x=setup([{success:true}]);
  await expect(x.storage.compareAndSwap({expected:first,next:second}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_STORAGE_INVALID_RESPONSE"});
 });
 it("rejects invalid sequence jumps before network",async()=>{
  const x=setup(true);
  await expect(x.storage.compareAndSwap({expected:first,next:{...second,count:3}}))
   .rejects.toMatchObject({code:"XSUS_CHECKPOINT_STORAGE_INVALID_RECORD"});
  expect(x.fetchImpl).not.toHaveBeenCalled();
 });
 it("fails closed on transport outage",async()=>{
  const x=setup();
  x.fetchImpl.mockRejectedValueOnce(Error("private-secret"));
  await expect(x.storage.readCheckpoint()).rejects.toMatchObject({
   code:"XSUS_CHECKPOINT_STORAGE_UNAVAILABLE"});
 });
 it("fails closed on HTTP rejection",async()=>{
  const x=setup([],false);
  await expect(x.storage.readCheckpoint()).rejects.toMatchObject({
   code:"XSUS_CHECKPOINT_STORAGE_UNAVAILABLE"});
 });
 it("never returns server credentials",async()=>{
  const x=setup();
  expect(JSON.stringify(await x.storage.readCheckpoint())).not.toContain("secret-server-key");
 });
});
