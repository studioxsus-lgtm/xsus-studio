import {describe,it,expect} from 'vitest';
import {nextAccountRetryDelay,shouldRetryAccountSave,isCurrentAccountSaveTarget,ACCOUNT_AUTOSAVE_RETRY_DELAYS} from '../../assets/js/xsus-app/account-retry-policy.js';
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
  it('blocks stale retries after switching projects, users or account revisions',()=>{
    const session={accountProject:{id:'p1',token:'rev1'}};
    const args={owner:'u1',activeOwner:'u1',session,activeSession:session,projectId:'p1',token:'rev1'};
    expect(isCurrentAccountSaveTarget(args)).toBe(true);
    expect(isCurrentAccountSaveTarget({...args,activeOwner:'u2'})).toBe(false);
    expect(isCurrentAccountSaveTarget({...args,activeSession:{...session}})).toBe(false);
    expect(isCurrentAccountSaveTarget({...args,projectId:'p2'})).toBe(false);
    expect(isCurrentAccountSaveTarget({...args,token:'rev2'})).toBe(false);
  });
  it('never retries revision conflicts or successful writes',()=>{
    expect(shouldRetryAccountSave({result:'revision-conflict',ownerMatches:true,linked:true,conflicted:false})).toBe(false);
    expect(shouldRetryAccountSave({result:'saved',ownerMatches:true,linked:true,conflicted:false})).toBe(false);
    expect(shouldRetryAccountSave({result:'retryable-error',ownerMatches:true,linked:true,conflicted:true})).toBe(false);
  });
});
