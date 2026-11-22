import {describe,it,expect} from "vitest";
import {analyzeStaticProject} from "../../src/xsus-app-build-engine/quality/static-quality-engine.js";
import {createQualityGate} from "../../src/xsus-app-build-engine/quality/quality-gate.js";
const app=(html,js="")=>({project:"test-app",files:[{path:"index.html",content:html},{path:"main.js",content:js},{path:"styles.css",content:"body{}"}]});
const clean='<!doctype html><html><head><title>Test</title></head><body></body></html>';
describe("XSUS quality gate",()=>{
  it("approves a clean static skeleton",()=>{const result=createQualityGate().inspect(app(clean));expect(result.approved).toBe(true);expect(result.report.mode).toBe("static-heuristic");});
  it("blocks eval usage",()=>{const result=createQualityGate().inspect(app(clean,"eval('1')"));expect(result.approved).toBe(false);expect(result.report.diagnostics.some(d=>d.rule==="EVAL_USAGE")).toBe(true);});
  it("warns about inline scripts",()=>{const result=createQualityGate().inspect(app(clean.replace("</body>","<script>alert(1)</script></body>")));expect(result.warningCount).toBe(1);});
  it("enforces a warning threshold",()=>{const html=clean.replace("</body>","<script>alert(1)</script></body>");expect(createQualityGate({maxWarnings:0}).inspect(app(html)).approved).toBe(false);});
  it("flags remote scripts",()=>{const result=createQualityGate().inspect(app(clean.replace("</body>",'<script src="https://example.com/x.js"></script></body>')));expect(result.report.diagnostics.some(d=>d.rule==="REMOTE_SCRIPT")).toBe(true);});
  it("warns about possible secrets",()=>{const result=createQualityGate().inspect(app(clean,'const apiKey="abcdefghijklmnopqrstuvwxyz123456";'));expect(result.report.diagnostics.some(d=>d.rule==="SECRET_PATTERN")).toBe(true);});
  it("reports missing entry in direct static analysis",()=>{const result=analyzeStaticProject({files:[{path:"main.js",content:""}]});expect(result.passed).toBe(false);});
  it("rejects invalid threshold",()=>{expect(()=>createQualityGate({maxWarnings:-1})).toThrow("threshold");});
});
