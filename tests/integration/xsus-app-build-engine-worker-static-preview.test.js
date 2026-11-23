import {describe,it,expect} from "vitest";
import {generateWorkerStaticPreview} from "../../services/src/build-worker/static-preview-build.js";
describe("XSUS worker static preview generation",()=>{
 it("generates HTML CSS JS",()=>expect(generateWorkerStaticPreview({name:"Notes App"}).files.map(x=>x.path)).toEqual(["index.html","styles.css","main.js"]));
 it("escapes untrusted HTML in title",()=>expect(generateWorkerStaticPreview({name:"<img src=x>"}).files[0].content).not.toContain("<img src=x>"));
 it("rejects empty title",()=>expect(()=>generateWorkerStaticPreview({name:""})).toThrow());
 it("rejects oversized title",()=>expect(()=>generateWorkerStaticPreview({name:"a".repeat(101)})).toThrow());
 it("requires manual review",()=>expect(generateWorkerStaticPreview({name:"Notes"}).requiresReview).toBe(true));
});
