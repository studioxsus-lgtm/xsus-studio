import {describe,it,expect} from 'vitest';
import {nextAccountRetryDelay,shouldRetryAccountSave,ACCOUNT_AUTOSAVE_RETRY_DELAYS} from '../../assets/js/xsus-app/account-retry-policy.js';
describe('XSUS App phase 1.5 transient account save recovery',()=>{
  it('uses bounded increasing retry delays',()=>{
    expect([1,2,3,4,5,20].map(nextAccountRetryDelay)).toEqual([2000,5000,15000,30000,60000,60000]);
  });
  it('rejects invalid retry counters',()=>{
    expect(nextAccountRetryDelay(0)).toBe(null);
    expect(nextAccountRetryDelay(-1)).toBe(null);
    expect(nextAccountRetryDelay(1.5)).toBe(null);
    expect(ACCOUNT_AUTOSAVE_RETRY_DELAYS).toHaveLength(5);
  });
  it('retries transient failures only for the same authenticated owner and linked project',()=>{
    expect(shouldRetryAccountSave({result:'retryable-error',ownerMatches:true,linked:true,conflicted:false})).toBe(true);
    expect(shouldRetryAccountSave({result:'retryable-error',ownerMatches:false,linked:true,conflicted:false})).toBe(false);
    expect(shouldRetryAccountSave({result:'retryable-error',ownerMatches:true,linked:false,conflicted:false})).toBe(false);
  });
  it('never retries revision conflicts or successful writes',()=>{
    expect(shouldRetryAccountSave({result:'revision-conflict',ownerMatches:true,linked:true,conflicted:false})).toBe(false);
    expect(shouldRetryAccountSave({result:'saved',ownerMatches:true,linked:true,conflicted:false})).toBe(false);
    expect(shouldRetryAccountSave({result:'retryable-error',ownerMatches:true,linked:true,conflicted:true})).toBe(false);
  });
});
