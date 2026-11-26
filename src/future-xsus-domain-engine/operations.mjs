import {createHash} from 'node:crypto';
import {operationKey,createOperationDraft} from './commerce.mjs';
const transitions=Object.freeze({draft:['approved','cancelled'],approved:['cancelled'],cancelled:[]});
export function createOperationService(store,{clock=Date.now}={}){
 if(!store||typeof store.insertOnce!=='function'||typeof store.get!=='function'||typeof store.compareAndSet!=='function')throw new TypeError('Atomic store required');
 return Object.freeze({
 async draft(accountId,requestId,quote){
 const key=operationKey(accountId,requestId),draft=createOperationDraft(quote,accountId,clock());
 const result=await store.insertOnce(accountId,key,{...draft,key,revision:0,history:[{status:'draft',at:clock()}]});
 if(result.accountId!==accountId||result.key!==key||result.digest!==draft.digest)throw new Error('Idempotency conflict');
 return result;
 },
 async transition(accountId,requestId,next,{expectedRevision,approvedDigest}={}){
 const key=operationKey(accountId,requestId),current=await store.get(accountId,key);
 if(!current||current.accountId!==accountId||current.key!==key)throw new Error('Operation not found');
 if(!Number.isSafeInteger(expectedRevision)||current.revision!==expectedRevision)throw new Error('Revision conflict');
 if(!transitions[current.status]?.includes(next))throw new Error('Invalid transition');
 if(next==='approved'&&(current.expiresAt<=clock()||approvedDigest!==current.digest))throw new Error('Approval rejected');
 const updated={...current,status:next,revision:current.revision+1,history:[...current.history,{status:next,at:clock()}]};
 if(!await store.compareAndSet(accountId,key,expectedRevision,updated))throw new Error('Revision conflict');
 return updated;
 }
 });
}
