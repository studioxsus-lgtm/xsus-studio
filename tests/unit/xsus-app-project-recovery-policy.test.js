import {describe,it,expect} from 'vitest';
import {hasProjectWork,canCaptureProject} from '../../assets/js/xsus-app/project-recovery-policy.js';
const files={'index.html':'<h1>App</h1>','styles.css':'body{}','main.js':'console.log(1)'};
describe('XSUS App phase 1.4 account recovery safety',()=>{
  it('recognizes a clean workspace as empty',()=>expect(hasProjectWork({sessions:[{messages:[]}],goal:'',steps:''})).toBe(false));
  it('protects a source-only draft from automatic account restoration',()=>{
    const builder={sessions:[{messages:[],generatedFiles:files}],goal:'',steps:''};
    expect(hasProjectWork(builder)).toBe(true);
    expect(canCaptureProject(builder,builder.sessions[0])).toBe(true);
  });
  it('protects revision-only drafts from automatic account restoration',()=>{
    expect(hasProjectWork({sessions:[{messages:[],generatedSourceHistory:[{id:'a'}]}]})).toBe(true);
  });
  it('recognizes existing conversations, account links and user prompts',()=>{
    expect(hasProjectWork({sessions:[{messages:[{role:'user',text:'Hi'}]}]})).toBe(true);
    expect(hasProjectWork({sessions:[{accountProject:{id:'p'}}]})).toBe(true);
    expect(hasProjectWork({sessions:[],goal:'Create a task app'})).toBe(true);
  });
  it('rejects missing active sessions for capture',()=>{
    expect(canCaptureProject({sessions:[],goal:'something'},undefined)).toBe(false);
  });
});
