import {describe,it,expect} from 'vitest';
import {classifyAccountSaveResult,shouldQueueAccountSave} from '../../assets/js/xsus-app/account-autosave-policy.js';
describe('XSUS App phase 1.4 account autosave policy',()=>{
 it('accepts a confirmed save',()=>expect(classifyAccountSaveResult(null,'project-1','project-1')).toBe('saved'));
 it('flags optimistic revision conflicts',()=>expect(classifyAccountSaveResult(null,null,'project-1')).toBe('revision-conflict'));
 it('rejects a response for a different project',()=>expect(classifyAccountSaveResult(null,'project-2','project-1')).toBe('revision-conflict'));
 it('treats transient Supabase errors as retryable, not conflicts',()=>expect(classifyAccountSaveResult({message:'network error'},null,'project-1')).toBe('retryable-error'));
 it('queues writes while autosave is in flight',()=>{
   expect(shouldQueueAccountSave({busy:true})).toBe(true);
   expect(shouldQueueAccountSave({saving:true})).toBe(true);
   expect(shouldQueueAccountSave({})).toBe(false);
 });
});
