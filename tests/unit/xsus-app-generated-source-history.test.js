import {describe,it,expect} from 'vitest';
import {appendGeneratedSourceRevision,findGeneratedSourceRevision,GENERATED_SOURCE_HISTORY_LIMIT} from '../../assets/js/xsus-app/generated-source-history.js';
const makeFiles=()=>({'index.html':'<h1>Task Manager</h1>','styles.css':'h1{color:blue}','main.js':'console.log("ready")'});
describe('XSUS App phase 1 generated source recovery',()=>{
  it('captures immutable copies of all three generated files',()=>{
    const files=makeFiles();
    const history=appendGeneratedSourceRevision([],files,'2026-11-23T00:00:00Z','first');
    files['index.html']='<h1>Edited</h1>';
    expect(history[0].files['index.html']).toContain('Task Manager');
  });
  it('does not create duplicate revisions for unchanged source',()=>{
    const files=makeFiles();
    const first=appendGeneratedSourceRevision([],files,'now','one');
    expect(appendGeneratedSourceRevision(first,files,'later','two')).toHaveLength(1);
  });
  it('recovers an older source revision without modifying history',()=>{
    const files=makeFiles();
    const old=appendGeneratedSourceRevision([],files,'now','one');
    const changed={...files,'index.html':'<h1>New</h1>'};
    const history=appendGeneratedSourceRevision(old,changed,'later','two');
    const recovered=findGeneratedSourceRevision(history,'one');
    recovered['index.html']='changed again';
    expect(history[0].files['index.html']).toContain('Task Manager');
    expect(findGeneratedSourceRevision(history,'two')['index.html']).toContain('New');
  });
  it('limits history size while retaining latest revision',()=>{
    const files=makeFiles();
    let history=[];
    for(let i=0;i<GENERATED_SOURCE_HISTORY_LIMIT+5;i++)history=appendGeneratedSourceRevision(history,{...files,'index.html':String(i)},'now',String(i));
    expect(history).toHaveLength(GENERATED_SOURCE_HISTORY_LIMIT);
    expect(history[0].id).toBe('5');
    expect(history.at(-1).id).toBe(String(GENERATED_SOURCE_HISTORY_LIMIT+4));
  });
  it('rejects invalid generated files and unknown revision ids',()=>{
    expect(()=>appendGeneratedSourceRevision([],{'index.html':'missing'})).toThrow(TypeError);
    expect(findGeneratedSourceRevision([], 'missing')).toBe(null);
  });
});
