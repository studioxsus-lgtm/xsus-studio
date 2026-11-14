import {describe,it,expect,vi} from "vitest";
import {createXsusHyperPanel} from "../xsus-hyper-panel.js";

function setup(options={}){
 const listeners=new Map();
 const button={disabled:false,addEventListener:(name,fn)=>listeners.set(name,fn),
  removeEventListener:name=>listeners.delete(name)};
 const status={textContent:""},details={textContent:""};
 const root={querySelector:selector=>({
  "[data-hyper-check]":button,"[data-hyper-status]":status,
  "[data-hyper-details]":details
 })[selector]};
 const fetchAssurance=vi.fn(async()=>({safeToResume:true,consistent:true}));
 const panel=createXsusHyperPanel({
  root,getAccessToken:async()=>"access-token",fetchAssurance,...options
 });
 return {panel,button,status,details,fetchAssurance,listeners};
}
describe("XSUS App Hyper v8.0 browser panel",()=>{
 it("requires dependencies",()=>{
  expect(()=>createXsusHyperPanel()).toThrow(TypeError);
 });
 it("shows an unverified initial state",()=>{
  const x=setup();
  expect(x.status.textContent).toBe("Not checked");
 });
 it("verifies only when user requests it",async()=>{
  const x=setup();
  expect(x.fetchAssurance).not.toHaveBeenCalled();
  await x.panel.refresh();
  expect(x.fetchAssurance).toHaveBeenCalledWith({token:"access-token"});
  expect(x.status.textContent).toContain("verified");
 });
 it("requires a session and never calls the backend without one",async()=>{
  const x=setup({getAccessToken:async()=>null});
  await x.panel.refresh();
  expect(x.fetchAssurance).not.toHaveBeenCalled();
  expect(x.status.textContent).toContain("Sign in required");
 });
 it("shows manual review for blocked assurance",async()=>{
  const x=setup({fetchAssurance:async()=>({safeToResume:false,consistent:false})});
  await x.panel.refresh();
  expect(x.status.textContent).toContain("manual review");
 });
 it("shows unavailable without leaking transport errors",async()=>{
  const x=setup({fetchAssurance:async()=>{throw new Error("private secret");}});
  await x.panel.refresh();
  expect(x.details.textContent).not.toContain("secret");
  expect(x.status.textContent).toContain("unavailable");
 });
 it("does not duplicate concurrent requests",async()=>{
  let resolve;
  const x=setup({fetchAssurance:()=>new Promise(r=>{resolve=r;})});
  const pending=x.panel.refresh();
  await Promise.resolve();
  await Promise.resolve();
  await x.panel.refresh();
  resolve({safeToResume:true,consistent:true});
  await pending;
  expect(x.button.disabled).toBe(false);
 });
 it("removes listener on dispose",()=>{
  const x=setup();
  expect(x.listeners.has("click")).toBe(true);
  x.panel.dispose();
  expect(x.listeners.has("click")).toBe(false);
  expect(x.button.disabled).toBe(true);
 });
});
