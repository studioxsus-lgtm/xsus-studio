import {describe,it,expect} from 'vitest';
import {validProjectSource,copyProjectSource,restoreProjectSource} from '../../assets/js/xsus-app/project-source-snapshot.js';
const source={ 'index.html':'<h1>New title</h1>', 'styles.css':'h1{color:red}', 'main.js':'console.log(1)' };
describe('XSUS App phase 1 — project source persistence contract',()=>{
  it('accepts a complete generated project',()=>expect(validProjectSource(source)).toBe(true));
  it('rejects incomplete and oversized files',()=>{
    expect(validProjectSource({...source,'main.js':undefined})).toBe(false);
    expect(validProjectSource({...source,'index.html':'x'.repeat(250001)})).toBe(false);
  });
  it('copies source without sharing mutable references',()=>{
    const copied=copyProjectSource(source);
    copied['index.html']='edited';
    expect(source['index.html']).toBe('<h1>New title</h1>');
  });
  it('restores the saved project rather than stale cache',()=>{
    const stale={...source,'index.html':'<h1>Old title</h1>'};
    expect(restoreProjectSource(source,stale)['index.html']).toContain('New title');
  });
  it('falls back to local cache when the snapshot has no source',()=>{
    expect(restoreProjectSource(null,source)).toEqual(source);
  });
  it('does not fabricate missing project files',()=>{
    expect(restoreProjectSource(null,{'index.html':'only'})).toBe(null);
  });
});
