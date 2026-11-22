import { describe, expect, it } from 'vitest';
import { generateSourceFiles, planSourceFiles } from '../../assets/js/xsus-app/code-generation/index.js';

const spec = {
  state: 'approved_for_next_phase',
  review: { acceptedByUser: true },
  product: { label: 'My Tasks', goal: 'Build a task management app.' },
  proposedStructure: {
    pages: ['Overview', 'Tasks'],
    components: ['Task card'],
    dataModels: ['Task'],
    interactions: ['Create task']
  },
  requirements: ['Manage tasks']
};
describe('XSUS App source generator', () => {
  it('requires explicit approval', () => {
    expect(() => planSourceFiles({ ...spec, state: 'draft' })).toThrow();
    expect(() => generateSourceFiles({ ...spec, review: { acceptedByUser: false } })).toThrow();
  });
  it('creates separate source files without deployment or server execution', () => {
    const bundle = generateSourceFiles(spec);
    expect(Object.keys(bundle.files)).toEqual(['index.html', 'styles.css', 'app.js']);
    expect(bundle.files['index.html']).toContain('styles.css');
    expect(bundle.files['index.html']).toContain('app.js');
    expect(bundle.files['app.js']).toContain('Create task');
    expect(bundle.plan.deploymentRequested).toBe(false);
    expect(bundle.plan.executableOnServer).toBe(false);
  });
  it('escapes user-provided markup and script delimiters', () => {
    const result = generateSourceFiles({
      ...spec, product: { label: '<img src=x onerror=alert(1)>', goal: '</script><script>alert(1)</script>' },
      proposedStructure: { ...spec.proposedStructure, pages: ['<script>alert(1)</script>'] },
      requirements: ['Safe text']
    });
    expect(result.files['index.html']).not.toContain('<script>alert(1)</script>');
    expect(result.files['index.html']).toContain('&lt;script&gt;');
    expect(result.files['app.js']).not.toContain('</script>');
  });
});
