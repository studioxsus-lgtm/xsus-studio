import {describe,it,expect} from 'vitest';
import {prepareBuild} from '../../assets/js/xsus-app/code-generation/build-pipeline.js';
import {prepareDeploymentPlan} from '../../assets/js/xsus-app/code-generation/deployment-preflight.js';
const files={
 'index.html':'<!doctype html><html><head><title>XSUS</title><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="styles.css"></head><body><script src="app.js"></script></body></html>',
 'styles.css':'body {color:blue}', 'app.js':'console.log("ready")'
};
describe('deployment preparation',()=>{
 it('prepares static hosting steps without publishing',async()=>{
   const build=await prepareBuild(files);
   const result=await prepareDeploymentPlan(build.artifacts);
   expect(result.ready).toBe(true);
   expect(result.plan.status).toBe('prepared-not-deployed');
   expect(result.plan.manualSteps.length).toBeGreaterThan(0);
 });
 it('blocks modified artifacts',async()=>{
   const build=await prepareBuild(files);
   build.artifacts['app.js']+='tampered';
   expect((await prepareDeploymentPlan(build.artifacts)).ready).toBe(false);
 });
 it('rejects unsupported targets',async()=>{
   await expect(prepareDeploymentPlan({},'production-api')).rejects.toThrow();
 });
});
