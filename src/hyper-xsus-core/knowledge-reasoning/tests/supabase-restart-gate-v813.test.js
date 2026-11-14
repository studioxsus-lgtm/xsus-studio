import {describe,it,expect,vi} from "vitest";
import {createSupabaseRestartGate} from "../supabase-restart-gate-v813.js";
const TIP="a".repeat(64),ZERO="0".repeat(64);
const checkpoint=()=>({count:2,tip:TIP});
function gate({verifyAudit=async()=>({verified:true,count:2,tip:TIP}),
 readTrustedCheckpoint=async()=>checkpoint()}={}){
 return createSupabaseRestartGate({verifyAudit,readTrustedCheckpoint});
}
describe("Hyper v8.1.3 restart recovery gate",()=>{
 it("requires both independent dependencies",()=>{
  expect(()=>createSupabaseRestartGate()).toThrow(TypeError);
 });
 it("accepts matching verified audit and checkpoint without authorizing recovery",async()=>{
  const result=await gate().assess();
  expect(result).toMatchObject({verified:true,status:"verified",
   safeToResume:false,recoveryAuthorized:false,count:2,tip:TIP});
 });
 it("fails closed when checkpoint is missing",async()=>{
  const result=await gate({readTrustedCheckpoint:async()=>null}).assess();
  expect(result.blockers).toContain("XSUS_RESTART_CHECKPOINT_INVALID");
 });
 it("fails closed when checkpoint reader throws",async()=>{
  const result=await gate({readTrustedCheckpoint:async()=>{throw Error("offline");}}).assess();
  expect(result.blockers).toContain("XSUS_RESTART_VERIFICATION_UNAVAILABLE");
 });
 it("fails closed when audit reader throws",async()=>{
  const result=await gate({verifyAudit:async()=>{throw Error("offline");}}).assess();
  expect(result.verified).toBe(false);
 });
 it("rejects an unverified audit",async()=>{
  const result=await gate({verifyAudit:async()=>({verified:false,count:2,tip:TIP})}).assess();
  expect(result.blockers).toContain("XSUS_RESTART_AUDIT_UNVERIFIED");
 });
 it("detects truncated audit",async()=>{
  const result=await gate({verifyAudit:async()=>({verified:true,count:1,tip:ZERO})}).assess();
  expect(result.blockers).toContain("XSUS_RESTART_CHECKPOINT_MISMATCH");
 });
 it("rejects an audit ahead of checkpoint without prefix proof",async()=>{
  const result=await gate({verifyAudit:async()=>({verified:true,count:3,tip:"b".repeat(64)})}).assess();
  expect(result.blockers).toContain("XSUS_RESTART_CHECKPOINT_MISMATCH");
 });
 it("rejects a changed checkpoint during inspection",async()=>{
  const readTrustedCheckpoint=vi.fn()
   .mockResolvedValueOnce(checkpoint())
   .mockResolvedValueOnce({count:3,tip:"b".repeat(64)});
  const result=await gate({readTrustedCheckpoint}).assess();
  expect(result.blockers).toContain("XSUS_RESTART_CHECKPOINT_CHANGED");
 });
 it("rejects malformed checkpoint hash",async()=>{
  const result=await gate({readTrustedCheckpoint:async()=>({count:2,tip:"bad"})}).assess();
  expect(result.blockers).toContain("XSUS_RESTART_CHECKPOINT_INVALID");
 });
 it("supports matching initialized empty chain",async()=>{
  const result=await gate({verifyAudit:async()=>({verified:true,count:0,tip:ZERO}),
   readTrustedCheckpoint:async()=>({count:0,tip:ZERO})}).assess();
  expect(result.verified).toBe(true);
 });
 it("never exposes internal errors or credentials",async()=>{
  const result=await gate({verifyAudit:async()=>{throw Error("secret-key");}}).assess();
  expect(JSON.stringify(result)).not.toContain("secret-key");
 });
 it("returns immutable verification reports",async()=>{
  const result=await gate().assess();
  expect(Object.isFrozen(result)).toBe(true);
 });
});
