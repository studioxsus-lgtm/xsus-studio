import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {createExecutionAudit} from "../../src/xsus-app-build-engine/sandbox/execution-audit.js";
const id="execution-0001";
const digest=async input=>createHash("sha256").update(input).digest("hex");
function setup(){
 const events=[];
 const audit=createExecutionAudit({digest,clock:()=>100,readEvents:async()=>events.map(e=>({...e})),appendAtomic:async(_id,expected,event)=>{const head=events.at(-1)?.hash??"0".repeat(64);if(head!==expected)return false;events.push({...event});return true;}});
 return {events,audit};
}
describe("XSUS phase 37 execution audit integrity",()=>{
 it("requires trusted dependencies",()=>expect(()=>createExecutionAudit()).toThrow("dependencies"));
 it("verifies empty history",async()=>expect((await setup().audit.verify(id)).count).toBe(0));
 it("records first transition",async()=>{const {audit}=setup();expect(await audit.record({executionId:id,revision:1,fence:1,from:null,to:"registered"})).toMatchObject({sequence:1,to:"registered"});});
 it("chains transitions",async()=>{const {audit}=setup();await audit.record({executionId:id,revision:1,fence:1,from:null,to:"registered"});await audit.record({executionId:id,revision:2,fence:2,from:"registered",to:"running"});expect((await audit.verify(id)).count).toBe(2);});
 it("detects modified history",async()=>{const {audit,events}=setup();await audit.record({executionId:id,revision:1,fence:1,from:null,to:"registered"});events[0].to="failed";await expect(audit.verify(id)).rejects.toThrow("digest");});
 it("detects missing first event",async()=>{const {audit,events}=setup();await audit.record({executionId:id,revision:1,fence:1,from:null,to:"registered"});await audit.record({executionId:id,revision:2,fence:2,from:"registered",to:"running"});events.shift();await expect(audit.verify(id)).rejects.toThrow("integrity");});
 it("rejects stale revisions",async()=>{const {audit}=setup();await audit.record({executionId:id,revision:1,fence:1,from:null,to:"registered"});await expect(audit.record({executionId:id,revision:1,fence:2,from:"registered",to:"running"})).rejects.toThrow("conflict");});
 it("rejects invalid state",async()=>await expect(setup().audit.record({executionId:id,revision:1,fence:1,from:null,to:"unknown"})).rejects.toThrow("transition"));
 it("rejects invalid execution IDs",async()=>await expect(setup().audit.verify("../secret")).rejects.toThrow("ID"));
 it("rejects failed atomic append",async()=>{const audit=createExecutionAudit({digest,clock:()=>100,readEvents:async()=>[],appendAtomic:async()=>false});await expect(audit.record({executionId:id,revision:1,fence:1,from:null,to:"registered"})).rejects.toThrow("Concurrent");});
});
