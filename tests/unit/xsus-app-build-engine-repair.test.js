import {describe,it,expect} from "vitest";
import {createRepairEngine} from "../../src/xsus-app-build-engine/repair/repair-engine.js";
import {planRepairs} from "../../src/xsus-app-build-engine/repair/repair-planner.js";
const app={project:"demo-app",files:[{path:"index.html",content:"<html><head></head><body>Hello</body></html>"}]};
describe("XSUS self-repair phase 14",()=>{
  it("proposes safe review-only fixes",()=>{const result=createRepairEngine().propose(app);expect(result.plan.proposals.some(p=>p.rule==="HTML_DOCUMENT")).toBe(true);expect(result.plan.proposals.every(p=>p.requiresReview)).toBe(true);});
  it("does not mutate files without approval",()=>{const result=createRepairEngine().apply(app);expect(result.candidate.files[0].content).toBe(app.files[0].content);expect(result.applied).toHaveLength(0);});
  it("adds doctype when approved",()=>{const result=createRepairEngine().apply(app,{approvedRules:["HTML_DOCUMENT"]});expect(result.candidate.files[0].content).toMatch(/^<!doctype html>/i);});
  it("adds title when approved",()=>{const result=createRepairEngine().apply(app,{approvedRules:["HTML_TITLE"]});expect(result.candidate.files[0].content).toContain("<title>XSUS Application</title>");});
  it("creates stylesheet when approved",()=>{const result=createRepairEngine().apply(app,{approvedRules:["MISSING_STYLESHEET"]});expect(result.candidate.files.some(f=>f.path==="styles.css")).toBe(true);});
  it("rejects unsupported rules",()=>{expect(()=>createRepairEngine().apply(app,{approvedRules:["EVAL_USAGE"]})).toThrow("Invalid");});
  it("rejects unproposed rules",()=>{const withTitle={...app,files:[{path:"index.html",content:"<!doctype html><html><head><title>OK</title></head></html>"}]};expect(()=>createRepairEngine().apply(withTitle,{approvedRules:["HTML_TITLE"]})).toThrow("not proposed");});
  it("reports unsupported diagnostics as unresolved",()=>{const plan=planRepairs({diagnostics:[{rule:"EVAL_USAGE",severity:"error"}]});expect(plan.unresolved).toBe(1);expect(plan.proposals).toHaveLength(0);});
});
