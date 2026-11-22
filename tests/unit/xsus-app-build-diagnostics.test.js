import {describe,it,expect} from 'vitest';
import {inspectBuildReadiness} from '../../assets/js/xsus-app/code-generation/build-diagnostics.js';
const files = {
  'index.html':'<!doctype html><html><head><title>XSUS</title><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="styles.css"></head><body><script src="app.js"></script></body></html>',
  'styles.css':'body { color: blue; }',
  'app.js':'console.log("ok");'
};
describe('XSUS build readiness',()=>{
  it('marks complete static source preflight-ready',()=>expect(inspectBuildReadiness(files).status).toBe('preflight-ready'));
  it('marks missing title for review, not as a blocking error',()=>{
    const result=inspectBuildReadiness({...files,'index.html':files['index.html'].replace('<title>XSUS</title>','')});
    expect(result.status).toBe('review-recommended');
    expect(result.canBuild).toBe(true);
  });
  it('blocks incomplete source',()=>expect(inspectBuildReadiness({...files,'app.js':''}).status).toBe('blocked'));
  it('discloses that compilation and deployment are not verified',()=>expect(inspectBuildReadiness(files).limitations.length).toBeGreaterThan(0));
});
