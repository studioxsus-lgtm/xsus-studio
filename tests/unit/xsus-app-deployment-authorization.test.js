import {describe,it,expect} from 'vitest';
import {authorizeDeploymentPreparation as authorize} from '../../assets/js/xsus-app/code-generation/deployment-authorization.js';
const targets=['static-host','github-pages','render-static'];
describe('deployment preparation consent',()=>{
  it('rejects unacknowledged requests',()=>expect(authorize({target:'github-pages',acknowledged:false,confirmation:'PREPARE'},targets).authorized).toBe(false));
  it('rejects incorrect confirmation',()=>expect(authorize({target:'github-pages',acknowledged:true,confirmation:'deploy'},targets).authorized).toBe(false));
  it('rejects unknown targets',()=>expect(authorize({target:'unknown',acknowledged:true,confirmation:'PREPARE'},targets).authorized).toBe(false));
  it('limits consent to plan export, not remote deployment',()=>{
    const result=authorize({target:'render-static',acknowledged:true,confirmation:'PREPARE'},targets);
    expect(result.authorized).toBe(true);
    expect(result.scope).toBe('export-plan-only');
    expect(result.remoteDeploymentAllowed).toBe(false);
  });
});
