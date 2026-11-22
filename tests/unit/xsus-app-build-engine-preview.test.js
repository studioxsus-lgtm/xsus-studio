import {describe,it,expect,vi} from "vitest";
import {createPreviewDocument} from "../../src/xsus-app-build-engine/preview/preview-document.js";
import {createPreviewSession} from "../../src/xsus-app-build-engine/preview/preview-session.js";
const app=(html="<!doctype html><html><body><h1>Hello</h1></body></html>")=>({project:"demo-app",files:[{path:"index.html",content:html},{path:"styles.css",content:"h1{color:blue}"},{path:"main.js",content:"alert(1)"}]});
describe("XSUS static preview engine",()=>{
  it("creates a static preview document",()=>{const p=createPreviewDocument(app());expect(p.html).toContain("<h1>Hello</h1>");expect(p.html).toContain("h1{color:blue}");expect(p.previewMode).toBe("static");});
  it("does not inject generated main.js",()=>{const p=createPreviewDocument(app());expect(p.scriptIncluded).toBe(false);expect(p.html).not.toContain("alert(1)");});
  it("strips inline script blocks",()=>{const p=createPreviewDocument(app("<h1>ok</h1><script>evil()</script>"));expect(p.html).not.toContain("evil()");});
  it("includes a restrictive CSP",()=>{expect(createPreviewDocument(app()).html).toContain("default-src 'none'");});
  it("rejects invalid manifests",()=>{expect(()=>createPreviewDocument({project:"bad",files:[]})).toThrow();});
  it("increments revisions",()=>{const session=createPreviewSession();expect(session.snapshot().revision).toBe(0);expect(session.update(app()).revision).toBe(1);});
  it("notifies subscribers and supports unsubscribe",()=>{const session=createPreviewSession();const listener=vi.fn();const stop=session.subscribe(listener);session.update(app());stop();session.update(app());expect(listener).toHaveBeenCalledOnce();});
  it("preserves previous preview when update validation fails",()=>{const session=createPreviewSession();session.update(app());expect(()=>session.update({files:[]})).toThrow();expect(session.snapshot().revision).toBe(1);});
});
