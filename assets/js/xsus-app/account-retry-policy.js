// Bounded retry policy for transient XSUS App account autosave failures.
// Conflicts are not transient and must never be retried automatically.
export const ACCOUNT_AUTOSAVE_RETRY_DELAYS=Object.freeze([2000,5000,15000,30000,60000]);
export function nextAccountRetryDelay(failures){
  if(!Number.isInteger(failures)||failures<1)return null;
  return ACCOUNT_AUTOSAVE_RETRY_DELAYS[Math.min(failures-1,ACCOUNT_AUTOSAVE_RETRY_DELAYS.length-1)];
}
export function shouldRetryAccountSave({result,ownerMatches,linked,conflicted}){
  return result==='retryable-error'&&ownerMatches===true&&linked===true&&conflicted!==true;
}

export function isCurrentAccountSaveTarget({owner,activeOwner,session,activeSession,projectId,token}){
  return Boolean(owner&&owner===activeOwner&&session&&session===activeSession&&
    projectId&&session.accountProject?.id===projectId&&session.accountProject?.token===token);
}
