import {describe,it,expect} from "vitest";
import {createProjectHistory} from "../../src/xsus-app-build-engine/versioning/project-history.js";
import {compareProjectVersions} from "../../src/xsus-app-build-engine/versioning/project-diff.js";
const app=(html="hello",extra=[])=>({project:"demo-app",files:[{path:"index.html",content:html},...extra]});
describe("XSUS project memory and versioning phase 16",()=>{
  it("saves a project version",()=>{const history=createProjectHistory();const version=history.save(app(),{versionId:"v1"});expect(version.revision).toBe(1);});
  it("lists metadata without exposing file contents",()=>{const history=createProjectHistory();history.save(app(),{versionId:"v1"});expect(history.list("demo-app")).toEqual([{id:"v1",parentVersionId:null,revision:1}]);});
  it("restores an earlier immutable manifest",()=>{const history=createProjectHistory();history.save(app("old"),{versionId:"v1"});history.save(app("new"),{versionId:"v2",parentVersionId:"v1"});expect(history.restore("demo-app","v1").files[0].content).toBe("old");});
  it("rejects duplicate version IDs",()=>{const history=createProjectHistory();history.save(app(),{versionId:"v1"});expect(()=>history.save(app(),{versionId:"v1"})).toThrow("Duplicate");});
  it("rejects unknown parent versions",()=>{expect(()=>createProjectHistory().save(app(),{versionId:"v2",parentVersionId:"v1"})).toThrow("parent");});
  it("enforces version limits",()=>{const history=createProjectHistory({maxVersions:1});history.save(app(),{versionId:"v1"});expect(()=>history.save(app(),{versionId:"v2"})).toThrow("limit");});
  it("detects added removed and modified files",()=>{const result=compareProjectVersions(app("old",[{path:"old.css",content:"a"}]),app("new",[{path:"new.css",content:"b"}]));expect(result.modified).toEqual(["index.html"]);expect(result.added).toEqual(["new.css"]);expect(result.removed).toEqual(["old.css"]);});
  it("rejects comparisons between projects",()=>{expect(()=>compareProjectVersions(app(),{...app(),project:"other-app"})).toThrow("different");});
});
