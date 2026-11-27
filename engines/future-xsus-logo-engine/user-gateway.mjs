import {validate} from './intelligence-v4/project.mjs';
import {editProject} from './intelligence-v4/gateway.mjs';
import {graphicOptions} from './graphic-v3/professional.mjs';
import {options} from './creative-v2/intent.mjs';
import {randomUUID} from 'node:crypto';
export function createUserGateway({supabaseUrl,publishableKey,orchestrator,fetchImpl=fetch,clock=Date.now}={}){
 const url=new URL(supabaseUrl);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Invalid auth URL');
 if(typeof publishableKey!=='string'||!publishableKey||typeof orchestrator?.generate!=='function')throw new Error('Gateway configuration required');
 const quotas=new Map();let active=0;
 return async function generate({authorization,input,route}){
 if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9._-]{20,8192}$/.test(authorization))return {status:401,body:{error:'unauthorized'}};
 if(route==='edit'){try{validate(input)}catch{return {status:400,body:{error:'invalid_request'}}}}
 else if(!input||typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>4000||!['en','fr','sq'].includes(input.language)||Object.keys(input).some(k=>!['prompt','language','creative','graphic'].includes(k)))return {status:400,body:{error:'invalid_request'}};
 if(input.creative!==undefined){try{options(input.creative)}catch{return {status:400,body:{error:'invalid_creative_options'}}}}
 if(input.graphic!==undefined){try{graphicOptions(input.graphic);if(!input.creative)throw Error()}catch{return {status:400,body:{error:'invalid_graphic_options'}}}}
 if(active>=8)return {status:429,body:{error:'busy'}};
 active++;
 try{
 const response=await fetchImpl(new URL('/auth/v1/user',url),{headers:{authorization,apikey:publishableKey},redirect:'error',signal:AbortSignal.timeout(5000)});
 if(!response.ok)return {status:response.status===401||response.status===403?401:503,body:{error:'authentication_failed'}};
 const user=await response.json();
 if(typeof user.id!=='string'||! /^[0-9a-f-]{36}$/i.test(user.id))return {status:401,body:{error:'unauthorized'}};
 const now=clock();for(const [id,q] of quotas)if(q.until<=now)quotas.delete(id);
 let q=quotas.get(user.id);
 if(!q){if(quotas.size>=10000)return {status:429,body:{error:'busy'}};q={count:0,until:now+60000};quotas.set(user.id,q)}
 if(q.count>=5)return {status:429,body:{error:'rate_limit'}};
 q.count++;
 if(route==='edit')return await editProject({url,headers:{authorization,apikey:publishableKey},owner:user.id,input,fetchImpl,plan:orchestrator.editPlan});
 const result=await orchestrator.generate({prompt:input.prompt,language:input.language,requestId:randomUUID(),...(input.creative?{creative:input.creative}:{}),...(input.graphic?{graphic:input.graphic}:{})});
 return {status:200,body:result};
 }catch{return {status:503,body:{error:'generation_unavailable'}}}finally{active--}
 };
}
