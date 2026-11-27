import {randomBytes} from 'node:crypto';
import {planBrandAction,executeBrandAction} from './coordination.mjs';
export function createBrandApprovalStore({interpret,plan,ttl=120000,max=128,clock=Date.now}={}){
 if(typeof interpret!=='function'||typeof plan!=='function'||!Number.isInteger(ttl)||ttl<1000||ttl>600000||!Number.isInteger(max)||max<1||max>1024)throw TypeError('invalid_configuration');
 const entries=new Map();let pending=0;
 const valid=(owner,projectId)=>{if(typeof owner!=='string'||!owner||owner.length>128||typeof projectId!=='string'||!projectId||projectId.length>128)throw Error('invalid_identity');};
 const sweep=()=>{for(const [id,e] of entries)if(e.expires<=clock())entries.delete(id);};
 return Object.freeze({
 async prepare({owner,projectId,doc,revision,prompt,language}){valid(owner,projectId);sweep();if(entries.size+pending>=max)throw Error('approval_capacity');pending++;try{const draft=await planBrandAction(doc,{prompt,language,revision,interpret,plan});if(draft.status!=='ready')return {status:draft.status,intent:draft.intent};const id=randomBytes(32).toString('hex');entries.set(id,{owner,projectId,draft,expires:clock()+ttl});return {status:'ready',approvalId:id,intent:structuredClone(draft.intent),revision,expiresInMs:ttl};}finally{pending--;}},
 async execute({owner,projectId,doc,revision,approvalId}){valid(owner,projectId);sweep();const e=entries.get(approvalId);if(!e||e.owner!==owner||e.projectId!==projectId)throw Error('approval_required');entries.delete(approvalId);return executeBrandAction(doc,e.draft,{revision,approvalDigest:e.draft.digest});}
 });
}
