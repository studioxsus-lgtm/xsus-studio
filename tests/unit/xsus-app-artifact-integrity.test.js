import {describe,it,expect} from 'vitest';
import {prepareBuild} from '../../assets/js/xsus-app/code-generation/build-pipeline.js';
import {verifyBuildArtifacts} from '../../assets/js/xsus-app/code-generation/artifact-integrity.js';
const files={
  'index.html':'<!doctype html><html><head><title>App</title><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="styles.css"></head><body><script src="app.js"></script></body></html>',
  'styles.css':'body { color: blue; }',
  'app.js':'console.log("ok");'
};
describe('XSUS artifact integrity',()=>{
  it('verifies an unchanged build',async()=>{
    const result=await prepareBuild(files);
    expect(result.ok).toBe(true);
    expect((await verifyBuildArtifacts(result.artifacts)).ok).toBe(true);
  });
  it('detects changed source bytes',async()=>{
    const result=await prepareBuild(files);
    result.artifacts['app.js']+='//changed';
    expect((await verifyBuildArtifacts(result.artifacts)).ok).toBe(false);
  });
  it('rejects a missing manifest',async()=>{
    expect((await verifyBuildArtifacts(files)).ok).toBe(false);
  });
});
