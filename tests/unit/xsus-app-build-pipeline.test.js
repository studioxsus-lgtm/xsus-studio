import { describe, it, expect } from 'vitest';
import { prepareBuild } from '../../assets/js/xsus-app/code-generation/build-pipeline.js';
const files = {
  'index.html':'<!doctype html><html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="styles.css"></head><body><script src="app.js"></script></body></html>',
  'styles.css':'body { color: blue; }',
  'app.js':'console.log("ready");'
};
describe('XSUS App build pipeline', () => {
  it('builds three source files plus a manifest', async () => {
    const result = await prepareBuild(files,'Task Manager');
    expect(result.ok).toBe(true);
    expect(Object.keys(result.artifacts)).toEqual(['index.html','styles.css','app.js','xsus-build-manifest.json']);
    expect(JSON.parse(result.artifacts['xsus-build-manifest.json']).project).toBe('Task Manager');
  });
  it('blocks builds with missing files', async () => {
    const result = await prepareBuild({...files,'app.js':undefined});
    expect(result.ok).toBe(false);
    expect(result.artifacts).toBe(null);
  });
});
