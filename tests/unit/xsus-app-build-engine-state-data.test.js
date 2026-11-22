import {describe,it,expect,vi} from "vitest";
import {createStateStore} from "../../src/xsus-app-build-engine/data/state-store.js";
import {createFormValidator} from "../../src/xsus-app-build-engine/data/form-validator.js";
import {createApiRequest} from "../../src/xsus-app-build-engine/data/api-contract.js";
describe("XSUS App Build Engine phase 8 state and data",()=>{
  it("keeps immutable snapshots and increments revisions",()=>{const store=createStateStore({count:0});const old=store.snapshot();const next=store.update({count:1},{expectedRevision:0});expect(old.state.count).toBe(0);expect(next.revision).toBe(1);expect(Object.isFrozen(next.state)).toBe(true);});
  it("rejects revision conflicts",()=>{const store=createStateStore();store.update({count:1});expect(()=>store.update({count:2},{expectedRevision:0})).toThrow("conflict");});
  it("notifies and unsubscribes listeners",()=>{const store=createStateStore();const listener=vi.fn();const stop=store.subscribe(listener);store.update({a:1});stop();store.update({a:2});expect(listener).toHaveBeenCalledOnce();});
  it("rejects prototype pollution keys",()=>{const store=createStateStore();expect(()=>store.update(JSON.parse('{"__proto__":{"admin":true}}'))).toThrow("Unsafe");});
  it("validates required email and numeric fields",()=>{const form=createFormValidator({email:{type:"email",required:true},age:{type:"number"}});expect(form.validate({email:"user@example.com",age:25}).valid).toBe(true);expect(form.validate({email:"bad",age:"25"}).valid).toBe(false);});
  it("enforces maximum text length",()=>{const form=createFormValidator({name:{type:"string",maxLength:3}});expect(form.validate({name:"long"}).errors.name).toBe("too_long");});
  it("accepts safe relative API requests",()=>{expect(createApiRequest({method:"POST",path:"/api/projects",body:{name:"demo"}}).path).toBe("/api/projects");});
  it("rejects external URLs and unsafe methods",()=>{expect(()=>createApiRequest({path:"https://evil.test"})).toThrow();expect(()=>createApiRequest({method:"TRACE",path:"/api/projects"})).toThrow();});
});
