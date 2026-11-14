import {describe,it,expect} from "vitest";
import {createIncidentCheckpointPromotion} from "../incident-checkpoint-promotion.js";
const zero="0".repeat(64),a="a".repeat(64),b="b".repeat(64);
function setup({blockers=["UNANCHORED_ARCHIVE_TAIL"],approved=true,mutate=false,
 fork=false,casFails=false,uncertain=false}={}){
 let mark={count:0,tip:zero},calls=0,approvals=0,advances=0;
 const entries=[{sequence:1,signature:a},{sequence:2,signature:b}];
 const archive={verify:async()=>({count:2,tip:b,entries:entries.map(x=>({...x}))})};
 const guard={inspect:async()=>{calls++;return {archiveCount:2,archiveTip:b,
  trustedCount:0,trustedTip:zero,blockers:mutate&&calls>1?["WRITER_LOCK_REVIEW_REQUIRED"]:blockers};}};
 const checkpoint={read:async()=>({...mark}),advance:async(previous,next)=>{
  advances++;
  if(casFails)throw Object.assign(Error("CAS conflict"),{code:"XSUS_CHECKPOINT_CAS_CONFLICT"});
  if(mark.count!==previous.count||mark.tip!==previous.tip)throw Error("stale");
  if(!uncertain)mark={...next};
 }};
 const authorize=async()=>{approvals++;return approved;};
 const promotion=createIncidentCheckpointPromotion({guard,archive,checkpoint,authorize});
 return {promotion,checkpoint,guard,archive,get approvals(){return approvals;},get advances(){return advances;}};
}
describe("Hyper Audit v3.9 — authorized checkpoint promotion",()=>{
 it("promotes a reviewed authenticated tail",async()=>{
  const f=setup();expect(await f.promotion.promote()).toMatchObject({status:"promoted",next:{count:2,tip:b}});
  expect(f.approvals).toBe(1);expect(f.advances).toBe(1);
 });
 for(const blockers of [
  [],["WRITER_LOCK_REVIEW_REQUIRED"],["ARCHIVE_ROLLBACK"],["TRUSTED_PREFIX_FORK"],
  ["UNANCHORED_ARCHIVE_TAIL","WRITER_LOCK_REVIEW_REQUIRED"],
  ["UNANCHORED_ARCHIVE_TAIL","TRUSTED_PREFIX_FORK"],
  ["UNANCHORED_ARCHIVE_TAIL","ARCHIVE_ROLLBACK"]
 ]){
  it("blocks conflicting incident status "+blockers.join(","),async()=>{
   const f=setup({blockers});
   await expect(f.promotion.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BLOCKED"});
   expect(f.advances).toBe(0);
  });
 }
 it("rejects absent reviewer approval",async()=>{
  const f=setup({approved:false});
  await expect(f.promotion.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_DENIED"});
  expect(f.advances).toBe(0);
 });
 it("rejects changing assessment after approval",async()=>{
  const f=setup({mutate:true});
  await expect(f.promotion.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_CHANGED"});
  expect(f.advances).toBe(0);
 });
 it("propagates CAS conflict without claiming success",async()=>{
  const f=setup({casFails:true});
  await expect(f.promotion.promote()).rejects.toMatchObject({code:"XSUS_CHECKPOINT_CAS_CONFLICT"});
 });
 it("reports uncertain persistence after CAS",async()=>{
  const f=setup({uncertain:true});
  await expect(f.promotion.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_UNCERTAIN"});
 });
 it("rejects missing dependencies",()=>{
  expect(()=>createIncidentCheckpointPromotion({})).toThrow(TypeError);
 });
 it("freezes promoted result",async()=>{
  const r=await setup().promotion.promote();
  expect(Object.isFrozen(r)).toBe(true);
  expect(Object.isFrozen(r.next)).toBe(true);
 });
 it("rejects simultaneous promotions on same instance",async()=>{
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  const f=setup();
  const promotion=createIncidentCheckpointPromotion({
   guard:f.guard,archive:f.archive,checkpoint:f.checkpoint,
   authorize:async()=>{await pending;return true;}
  });
  const first=promotion.promote();
  await expect(promotion.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BUSY"});
  release();await expect(first).resolves.toMatchObject({status:"promoted"});
 });
 it("blocks a second promotion after successful checkpoint advance",async()=>{
  const f=setup();await f.promotion.promote();
  await expect(f.promotion.promote()).rejects.toMatchObject({code:"XSUS_INCIDENT_PROMOTION_BLOCKED"});
 });
});
