import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../../assets/js/xsus-app/build-preview-staging.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../../app.html",import.meta.url),"utf8");
describe("XSUS App branch-only preview browser safety contract",()=>{
 it("loads the staging-only module from app.html",()=>{
  expect(html).toContain('assets/js/xsus-app/build-preview-staging.js');
  expect(source).toContain("xsus-app-build-api-staging.onrender.com");
  expect(source).not.toContain("xsus-app-deployment-api.onrender.com");
 });
 it("keeps generated JavaScript in an opaque-origin iframe",()=>{
  expect(source).toContain("setAttribute('sandbox','allow-scripts')");
  expect(source).not.toContain("allow-same-origin");
  expect(source).toContain("default-src 'none'");
  expect(source).toContain("frame.srcdoc=");
 });
 it("strips navigation and active HTML elements from generated documents",()=>{
  expect(source).toContain("node.localName==='a'");
  expect(source).toContain("attr.name.toLowerCase()==='href'");
  expect(source).toContain("iframe,object,embed,base,form");
  expect(source).toContain("form-action 'none'");
 });
 it("discards stale results and aborts on dialog close",()=>{
  expect(source).toContain("panel.addEventListener('close'");
  expect(source).toContain("activePreview?.abort()");
  expect(source).toContain("generation!==previewGeneration");
  expect(source).toContain("controller.signal.aborted");
 });
 it("requires exactly three bounded generated artifacts",()=>{
  expect(source).toContain("result.files.length!==3");
  expect(source).toContain("f.content.length>250000");
  for(const name of ["index.html","styles.css","main.js"])expect(source).toContain(name);
 });
});
