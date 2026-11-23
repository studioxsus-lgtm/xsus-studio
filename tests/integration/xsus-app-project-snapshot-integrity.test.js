import {describe,it,expect} from 'vitest';
import {inspectAccountProjectSnapshot} from '../../assets/js/xsus-app/project-snapshot-integrity.js';
const files={'index.html':'<h1>App</h1>','styles.css':'body{}','main.js':'console.log(1)'};
const snapshot=()=>({version:1,session:{messages:[],generatedFiles:{...files},generatedSourceHistory:[{id:'v1',files:{...files}}]},reviews:[],boards:[],goal:'',steps:''});
describe('XSUS App phase 1.7 account snapshot recovery integrity',()=>{
  it('accepts complete saved source and checkpoint history',()=>expect(inspectAccountProjectSnapshot(snapshot()).ok).toBe(true));
  it('rejects malformed account snapshots',()=>{
    expect(inspectAccountProjectSnapshot(null).reason).toBe('invalid-contract');
    expect(inspectAccountProjectSnapshot({...snapshot(),version:2}).ok).toBe(false);
  });
  it('rejects incomplete source instead of silently replacing local code',()=>{
    const s=snapshot();delete s.session.generatedFiles['main.js'];
    expect(inspectAccountProjectSnapshot(s).reason).toBe('invalid-source');
  });
  it('rejects corrupted and excessive revision history',()=>{
    const s=snapshot();s.session.generatedSourceHistory=[{id:'broken',files:{'index.html':'only'}}];
    expect(inspectAccountProjectSnapshot(s).reason).toBe('invalid-history');
    s.session.generatedSourceHistory=Array.from({length:21},(_,i)=>({id:String(i),files}));
    expect(inspectAccountProjectSnapshot(s).reason).toBe('invalid-history');
  });
  it('rejects malformed review and board relations',()=>{
    const s=snapshot();s.boards=[['missing-data']];
    expect(inspectAccountProjectSnapshot(s).reason).toBe('invalid-relations');
  });
  it('rejects invalid generated preview types',()=>{
    const s=snapshot();s.session.generatedHtml={html:'not a string'};
    expect(inspectAccountProjectSnapshot(s).reason).toBe('invalid-preview');
  });
  it('rejects null or malformed conversation entries',()=>{
    const s=snapshot();s.session.messages=[null];
    expect(inspectAccountProjectSnapshot(s).reason).toBe('invalid-messages');
  });
  it('accepts legacy snapshots without generated source history',()=>{
    const s=snapshot();delete s.session.generatedSourceHistory;delete s.session.generatedFiles;
    expect(inspectAccountProjectSnapshot(s).ok).toBe(true);
  });
});
