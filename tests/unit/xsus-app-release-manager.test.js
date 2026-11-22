import {describe,it,expect} from 'vitest';
import {appendBuildRelease} from '../../assets/js/xsus-app/code-generation/release-manager.js';
const manifest={schemaVersion:2,files:['index.html','styles.css','app.js'].map(name=>({name,bytes:1,sha256:'a'.repeat(64)}))};
describe('XSUS release manager',()=>{
  it('records a verified build as not deployed',()=>{
    const releases=appendBuildRelease([],manifest);
    expect(releases[0].status).toBe('prepared-not-deployed');
    expect(releases[0].number).toBe(1);
  });
  it('increments release numbers',()=>{
    const first=appendBuildRelease([],manifest);
    expect(appendBuildRelease(first,manifest)[1].number).toBe(2);
  });
  it('rejects invalid manifests',()=>expect(()=>appendBuildRelease([],{schemaVersion:1,files:[]})).toThrow());
});
