import {describe,it,expect,vi} from "vitest";
import {createDeploymentPlan} from "../../src/xsus-app-build-engine/deployment/deployment-plan.js";
import {createDeploymentPublisher} from "../../src/xsus-app-build-engine/deployment/deployment-publisher.js";
const app={project:"demo-app",files:[{path:"index.html",content:"<!doctype html>"},{path:"styles.css",content:"body{}"}]};
const options={deploymentId:"deploy_1",target:"render-static"};
describe("XSUS deployment and publishing phase 18",()=>{
  it("creates an approval-required deployment plan",()=>{const plan=createDeploymentPlan(app,options);expect(plan.requiresApproval).toBe(true);expect(plan.status).toBe("planned");});
  it("rejects unknown deployment targets",()=>{expect(()=>createDeploymentPlan(app,{...options,target:"shell"})).toThrow("target");});
  it("rejects forbidden artifact extensions",()=>{expect(()=>createDeploymentPlan({...app,files:[...app.files,{path:"secret.pem",content:"secret"}]},options)).toThrow("artifact");});
  it("requires a security verifier",()=>{expect(()=>createDeploymentPublisher({provider:{publish:async()=>({})}})).toThrow("verifier");});
  it("blocks publishing without approval",async()=>{const publish=vi.fn();const engine=createDeploymentPublisher({provider:{publish},securityVerifier:async()=>true});await expect(engine.publish(app,options)).rejects.toThrow("approval");expect(publish).not.toHaveBeenCalled();});
  it("blocks publishing after failed security verification",async()=>{const publish=vi.fn();const engine=createDeploymentPublisher({provider:{publish},securityVerifier:async()=>false});await expect(engine.publish(app,{...options,approved:true})).rejects.toThrow("verification");expect(publish).not.toHaveBeenCalled();});
  it("delegates approved verified plans to the provider",async()=>{const publish=vi.fn(async()=>({success:true,deploymentRef:"provider_123"}));const engine=createDeploymentPublisher({provider:{publish},securityVerifier:async()=>true});const result=await engine.publish(app,{...options,approved:true});expect(result.status).toBe("submitted");expect(publish).toHaveBeenCalledOnce();});
  it("refuses a cancelled deployment",async()=>{const publish=vi.fn();const engine=createDeploymentPublisher({provider:{publish},securityVerifier:async()=>true});await expect(engine.publish(app,{...options,approved:true,signal:{aborted:true}})).rejects.toThrow("cancelled");expect(publish).not.toHaveBeenCalled();});
});
