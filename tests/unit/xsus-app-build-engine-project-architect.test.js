import {describe,it,expect} from "vitest";
import {createProjectArchitecture} from "../../src/xsus-app-build-engine/architecture/project-architect.js";
const valid={name:"Business Dashboard",slug:"business-dashboard",modules:[{id:"dashboard",kind:"page"},{id:"api",kind:"service"}],routes:[{id:"home",path:"/",moduleId:"dashboard"}]};
describe("XSUS project architecture engine",()=>{
  it("creates immutable normalized architecture",()=>{const result=createProjectArchitecture(valid);expect(result.version).toBe("1.0.0");expect(result.routes[0].path).toBe("/");expect(Object.isFrozen(result.modules)).toBe(true);});
  it("rejects unsafe slugs",()=>{expect(()=>createProjectArchitecture({...valid,slug:"../escape"})).toThrow("slug");});
  it("rejects duplicate modules",()=>{expect(()=>createProjectArchitecture({...valid,modules:[valid.modules[0],valid.modules[0]]})).toThrow("Duplicate module");});
  it("rejects missing route module",()=>{expect(()=>createProjectArchitecture({...valid,routes:[{...valid.routes[0],moduleId:"unknown"}]})).toThrow("unknown module");});
  it("rejects duplicate route paths",()=>{expect(()=>createProjectArchitecture({...valid,routes:[valid.routes[0],{id:"other",path:"/",moduleId:"dashboard"}]})).toThrow("Duplicate route path");});
  it("rejects unsafe routes",()=>{expect(()=>createProjectArchitecture({...valid,routes:[{...valid.routes[0],path:"/../admin"}]})).toThrow("route");});
  it("rejects unknown module kinds",()=>{expect(()=>createProjectArchitecture({...valid,modules:[{id:"dashboard",kind:"shell"}]})).toThrow("module");});
});
