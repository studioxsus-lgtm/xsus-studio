import {describe,it,expect} from "vitest";
import {createArtifactIntegrityRecord,verifyArtifactIntegrity} from "../../src/xsus-app-build-engine/security/artifact-integrity.js";
import {inspectReleaseSecurity} from "../../src/xsus-app-build-engine/security/release-security-gate.js";
const html="<!doctype html><html><head><title>Demo</title></head><body>Hi</body></html>";
const app=(files=[{path:"index.html",content:html},{path:"styles.css",content:"body{}"}])=>({project:"demo-app",files});
const digest=()=> "a".repeat(64);
describe("XSUS phase 15 release security",()=>{
  it("requires an injected digest provider",()=>expect(()=>createArtifactIntegrityRecord(app())).toThrow("provider"));
  it("creates an integrity record",()=>expect(createArtifactIntegrityRecord(app(),{digest}).algorithm).toBe("sha256"));
  it("verifies a matching record",()=>{const record=createArtifactIntegrityRecord(app(),{digest});expect(verifyArtifactIntegrity(app(),record,{digest})).toBe(true);});
  it("rejects malformed digests",()=>expect(()=>createArtifactIntegrityRecord(app(),{digest:()=> "abc"})).toThrow("SHA-256"));
  it("never auto-approves publication",()=>{const result=inspectReleaseSecurity(app());expect(result.approved).toBe(false);expect(result.staticChecksPassed).toBe(true);});
  it("blocks packaged private key files",()=>{const result=inspectReleaseSecurity(app([{path:"index.html",content:html},{path:"secret.pem",content:"key"}]));expect(result.findings.some(f=>f.rule==="SENSITIVE_FILE")).toBe(true);});
  it("flags active HTML elements",()=>{const result=inspectReleaseSecurity(app([{path:"index.html",content:html.replace("Hi","<iframe src='x'></iframe>")}]));expect(result.findings.some(f=>f.rule==="ACTIVE_HTML")).toBe(true);});
  it("flags private key content",()=>{const result=inspectReleaseSecurity(app([{path:"index.html",content:html},{path:"notes.txt",content:"-----BEGIN PRIVATE KEY-----"}]));expect(result.findings.some(f=>f.rule==="PRIVATE_KEY")).toBe(true);});
});
