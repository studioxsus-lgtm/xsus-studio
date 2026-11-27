export async function brandProject({url,headers,owner,input,fetchImpl,approvals}){
 const endpoint=new URL('/rest/v1/logo_projects',url);endpoint.search=new URLSearchParams({id:'eq.'+input.projectId,owner_id:'eq.'+owner,select:'id,name,revision,document'});
 const r=await fetchImpl(endpoint,{headers,redirect:'error',signal:AbortSignal.timeout(8000)});if(!r.ok)return {status:503,body:{error:'storage_unavailable'}};
 const [row]=await r.json();if(!row)return {status:404,body:{error:'project_not_found'}};if(row.revision!==input.revision)return {status:409,body:{error:'project_conflict'}};
 const doc=row.document?.layers?row.document:row.document?.variants?.[input.slot??0]?.document;
 if(!doc)return {status:422,body:{error:'invalid_document'}};
 const args={owner,projectId:input.projectId,doc,revision:row.revision};
 try{if(input.action==='prepare')return {status:200,body:await approvals.prepare({...args,prompt:input.prompt,language:input.language})};const artifact=await approvals.execute({...args,approvalId:input.approvalId});return {status:200,artifact};}catch{return {status:422,body:{error:'brand_action_failed'}};}
}
export function validateBrandRequest(i){if(!i||!['prepare','execute'].includes(i.action)||typeof i.projectId!=='string'||! /^[0-9a-f-]{36}$/i.test(i.projectId)||!Number.isSafeInteger(i.revision)||i.revision<0||!Number.isInteger(i.slot??0)||(i.slot??0)<0||(i.slot??0)>11)throw TypeError('invalid_request');const keys=i.action==='prepare'?['action','projectId','revision','slot','prompt','language']:['action','projectId','revision','slot','approvalId'];if(Object.keys(i).some(k=>!keys.includes(k)))throw TypeError('invalid_request');if(i.action==='prepare'?(typeof i.prompt!=='string'||!i.prompt.trim()||i.prompt.length>4000||!['en','fr','sq'].includes(i.language)):typeof i.approvalId!=='string'||! /^[a-f0-9]{64}$/.test(i.approvalId))throw TypeError('invalid_request');}
