import {describe,it,expect} from "vitest";
import {assessProductionReadiness,PRODUCTION_READINESS_CHECKS} from "../../src/xsus-app-build-engine/release/production-readiness-gate.js";
describe("XSUS phase 70 production readiness gate",()=>{
 it("fails closed with no evidence",()=>{const result=assessProductionReadiness();expect(result.ready).toBe(false);expect(result.verifiedCount).toBe(0);});
 it("requires ten independent checks",()=>expect(PRODUCTION_READINESS_CHECKS).toHaveLength(10));
 it("does not accept booleans as evidence",()=>expect(assessProductionReadiness({ciRegressionPassed:true}).ready).toBe(false));
 it("rejects unsupported check names",()=>expect(()=>assessProductionReadiness({unknown:true})).toThrow("Unknown"));
 it("rejects arrays",()=>expect(()=>assessProductionReadiness([])).toThrow("Invalid"));
 it("requires nonempty references",()=>expect(assessProductionReadiness({ciRegressionPassed:{passed:true,reference:" "}}).verifiedCount).toBe(0));
 it("requires explicit passed true",()=>expect(assessProductionReadiness({ciRegressionPassed:{passed:"true",reference:"https://ci.example/run"}}).verifiedCount).toBe(0));
 it("counts individually evidenced checks",()=>expect(assessProductionReadiness({ciRegressionPassed:{passed:true,reference:"https://ci.example/run"}}).verifiedCount).toBe(1));
 it("rejects partial readiness",()=>expect(assessProductionReadiness({ciRegressionPassed:{passed:true,reference:"https://ci.example/run"}}).ready).toBe(false));
 it("passes only when all ten checks have evidence",()=>{const evidence=Object.fromEntries(PRODUCTION_READINESS_CHECKS.map(key=>[key,{passed:true,reference:"https://audit.example/"+key}]));expect(assessProductionReadiness(evidence)).toMatchObject({ready:true,verifiedCount:10,totalCount:10});});
 it("returns immutable check results",()=>{const result=assessProductionReadiness();expect(Object.isFrozen(result)).toBe(true);expect(Object.isFrozen(result.checks)).toBe(true);expect(Object.isFrozen(result.checks[0])).toBe(true);});
 it("does not accept oversized reference",()=>expect(assessProductionReadiness({ciRegressionPassed:{passed:true,reference:"x".repeat(513)}}).verifiedCount).toBe(0));
});
