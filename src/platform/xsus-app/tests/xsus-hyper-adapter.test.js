import {describe,it,expect,vi} from "vitest";
import {createXsusHyperAdapter} from "../xsus-hyper-adapter.js";

const ZERO="0".repeat(64);
const ready=()=>({status:"ready",safeToResume:true,blockers:[],
 anchor:{count:0,tip:ZERO},audit:{count:0,tip:ZERO}});
const create=(overrides={})=>createXsusHyperAdapter({
 verifyUser:async()=>({userId:"user-1"}),
 inspectHealth:async()=>ready(),
 ...overrides
});
const request=(adapter,authorization="Bearer valid")=>adapter.handle({authorization});

describe("XSUS App -> Hyper XSUS Core authenticated adapter",()=>{
 it("requires both server-only dependencies",()=>{
  expect(()=>createXsusHyperAdapter()).toThrow(TypeError);
 });
 it("denies missing bearer credentials without inspection",async()=>{
  const inspectHealth=vi.fn(async()=>ready());
  const x=await request(create({inspectHealth}),undefined);
  // Default request helper supplies a token; explicitly override here.
  expect(x.status).toBe(200);
  const denied=await create({inspectHealth}).handle({});
  expect(denied.status).toBe(401);
  expect(inspectHealth).toHaveBeenCalledTimes(12);
 });
 it("rejects malformed authorization without touching the inspector",async()=>{
  const inspectHealth=vi.fn(async()=>ready());
  const x=await request(create({inspectHealth}),"invalid");
  expect(x.status).toBe(401);
  expect(inspectHealth).not.toHaveBeenCalled();
 });
 it("rejects non-GET methods",async()=>{
  const x=await create().handle({method:"POST",authorization:"Bearer valid"});
  expect(x.status).toBe(405);
 });
 it("denies failed authentication",async()=>{
  const inspectHealth=vi.fn(async()=>ready());
  const x=await request(create({inspectHealth,verifyUser:async()=>{throw new Error("denied");}}));
  expect(x.status).toBe(403);
  expect(inspectHealth).not.toHaveBeenCalled();
 });
 it("denies invalid user identity",async()=>{
  const x=await request(create({verifyUser:async()=>({})}));
  expect(x.status).toBe(403);
 });
 it("returns redacted verified status",async()=>{
  const x=await request(create());
  expect(x.status).toBe(200);
  expect(x.data).toMatchObject({adapterVersion:"1.0.0",coreVersion:"8.0.0",
   safeToResume:true,consistent:true,rounds:3,completed:3});
  expect(x.data).not.toHaveProperty("anchor");
  expect(x.data).not.toHaveProperty("audit");
  expect(JSON.stringify(x.data)).not.toContain(ZERO);
 });
 it("fails closed on blocked health",async()=>{
  const x=await request(create({inspectHealth:async()=>({...ready(),status:"blocked"})}));
  expect(x.status).toBe(200);
  expect(x.data.safeToResume).toBe(false);
  expect(x.data.blockers).toContain("RECOVERY_ASSURANCE_ROUND_BLOCKED");
 });
 it("hides storage errors from callers",async()=>{
  const x=await request(create({inspectHealth:async()=>{throw new Error("private path /tmp/secret");}}));
  expect(x.status).toBe(503);
  expect(JSON.stringify(x.data)).not.toContain("secret");
 });
 it("does not leak authorization tokens",async()=>{
  const x=await request(create(),"Bearer sensitive-token");
  expect(JSON.stringify(x)).not.toContain("sensitive-token");
 });
 it("returns immutable successful results",async()=>{
  const x=await request(create());
  expect(Object.isFrozen(x.data)).toBe(true);
  expect(Object.isFrozen(x.data.blockers)).toBe(true);
 });
 it("supports explicit two-round assurance",async()=>{
  const x=await request(create({rounds:2}));
  expect(x.data.rounds).toBe(2);
  expect(x.data.completed).toBe(2);
 });
});
