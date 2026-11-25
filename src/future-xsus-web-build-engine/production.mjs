import {readRuntimeConfig} from './bootstrap.mjs';
import {createCoreTransport} from './core-transport.mjs';
import {createResilientTransport} from './resilience.mjs';
import {generateFromPrompt} from './intelligence.mjs';
import {createPersistentRuntime} from './persistent-runtime.mjs';
import {createPersistentGateway} from './persistent-gateway.mjs';
export function createIdentityVerifier({authUrl,publicKey,fetchImpl=globalThis.fetch}={}){
 const url=new URL(authUrl);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||typeof publicKey!=='string'||!publicKey.trim())throw TypeError('Invalid identity configuration');
 return async token=>{
 if(typeof token!=='string'||!token||token.length>8192||/\s/.test(token))return null;
 const response=await fetchImpl(new URL('/auth/v1/user',url),{headers:{apikey:publicKey,Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(5000)});
 if(response.status===401||response.status===403)return null;
 if(!response.ok)throw Error('Identity service unavailable');
 const user=await response.json();
 if(typeof user.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(user.id))return null;
 return {id:user.id};
 };
}
export async function createPersistentProduction({env,fetchImpl=globalThis.fetch}={}){
 const config=readRuntimeConfig(env);
 for(const key of ['XSUS_DATA_DIRECTORY','XSUS_FUTURE_TOKEN','XSUS_HYPER_TOKEN'])if(typeof env[key]!=='string'||!env[key].trim())throw TypeError('Missing '+key);
 const verifyIdentity=createIdentityVerifier({authUrl:env.XSUS_AUTH_URL,publicKey:env.XSUS_AUTH_PUBLIC_KEY,fetchImpl});
 const transport=createResilientTransport(createCoreTransport({...config,getToken:async core=>core==='future'?env.XSUS_FUTURE_TOKEN:env.XSUS_HYPER_TOKEN,fetchImpl}));
 const runtime=await createPersistentRuntime({directory:env.XSUS_DATA_DIRECTORY,verifyIdentity,generate:input=>generateFromPrompt(input,transport),maxJobs:config.maxJobs,maxConcurrent:config.maxConcurrent});
 const gateway=createPersistentGateway({runtime});
 return {server:gateway.server,port:config.port,stopAccepting:gateway.stopAccepting,diagnostics:()=>({ready:gateway.isReady(),...runtime.diagnostics(),cores:transport.diagnostics()})};
}
