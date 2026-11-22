import { describe, it, expect } from 'vitest';
import { validateSourceFiles } from '../../assets/js/xsus-app/code-generation/source-validator.js';

const valid = {
  'index.html': '<!doctype html><html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="styles.css"></head><body><script src="app.js"></script></body></html>',
  'styles.css': 'body { color: red; }',
  'app.js': 'document.body.dataset.ready = "true";'
};
describe('XSUS source preflight', () => {
  it('accepts complete source files', () => expect(validateSourceFiles(valid).ok).toBe(true));
  it('rejects a missing file', () => expect(validateSourceFiles({...valid,'app.js':undefined}).ok).toBe(false));
  it('rejects an incomplete document', () => expect(validateSourceFiles({...valid,'index.html':'<html><body>'}).ok).toBe(false));
  it('reports CSS brace imbalance as a warning', () => expect(validateSourceFiles({...valid,'styles.css':'body { color:red;'}).issues.some(x => x.file === 'styles.css' && x.level === 'warning')).toBe(true));
});
