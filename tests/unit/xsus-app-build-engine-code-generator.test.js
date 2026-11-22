import {describe,it,expect} from "vitest";
import {generateStaticApp} from "../../src/xsus-app-build-engine/generator/code-generator.js";
const architecture={name:"My Dashboard",slug:"my-dashboard",modules:[{id:"home",kind:"page"}],routes:[{id:"root",path:"/",moduleId:"home"}]};
describe("XSUS static code generator",()=>{
  it("produces three immutable standalone files",()=>{const result=generateStaticApp(architecture);expect(result.files.map(f=>f.path)).toEqual(["index.html","styles.css","main.js"]);expect(result.requiresReview).toBe(true);expect(Object.isFrozen(result.files)).toBe(true);});
  it("escapes markup in project names",()=>{const result=generateStaticApp({...architecture,name:'<script>alert("x")</script>'});expect(result.files[0].content).not.toContain("<script>alert");expect(result.files[0].content).toContain("&lt;script&gt;");});
  it("emits structured routes without code interpolation",()=>{const result=generateStaticApp(architecture);expect(result.files[2].content).toContain('"moduleId":"home"');});
  it("rejects projects without page modules",()=>{expect(()=>generateStaticApp({...architecture,modules:[{id:"api",kind:"service"}],routes:[]})).toThrow("page");});
  it("rejects invalid architectures",()=>{expect(()=>generateStaticApp({...architecture,slug:"../unsafe"})).toThrow("slug");});
});
