import {createCoreTransport} from './core-transport.mjs';
import {createResilientTransport} from './resilience.mjs';
import {generateFromPrompt} from './intelligence.mjs';
import {createGenerationGateway} from './gateway.mjs';
export function readRuntimeConfig(env){
 const integer=(key,fallback,min,max)=>{const raw=env[key]??String(fallback);if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)<min||Number(raw)>max)throw TypeError('Invalid '+key);return Number(raw)};
 const endpoint=key=>{const u=new URL(env[key]);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw TypeError('Invalid '+key);return u.href};
 const maxJobs=integer('XSUS_MAX_JOBS',100,1,1000);
 return Object.freeze({port:integer('PORT',8080,1,65535),futureUrl:endpoint('XSUS_FUTURE_URL'),hyperUrl:endpoint('XSUS_HYPER_URL'),timeoutMs:integer('XSUS_CORE_TIMEOUT_MS',10000,10,60000),maxJobs,maxConcurrent:integer('XSUS_MAX_CONCURRENT',Math.min(2,maxJobs),1,maxJobs)});
}
export function createProductionRuntime({env,verifyIdentity,getToken,fetchImpl=globalThis.fetch}={}){
 const config=readRuntimeConfig(env);
 const transport=createResilientTransport(createCoreTransport({futureUrl:config.futureUrl,hyperUrl:config.hyperUrl,timeoutMs:config.timeoutMs,getToken,fetchImpl}));
 const gateway=createGenerationGateway({verifyIdentity,generate:input=>generateFromPrompt(input,transport),jobOptions:{maxJobs:config.maxJobs,maxConcurrent:config.maxConcurrent}});
 let stopping=false;
 return Object.freeze({config,server:gateway.server,diagnostics:()=>({ready:gateway.isReady(),jobs:gateway.jobs.diagnostics(),cores:transport.diagnostics()}),
 async start(host='127.0.0.1'){if(stopping||gateway.server.listening)throw Error('Runtime unavailable');await new Promise((resolve,reject)=>{const error=e=>reject(e);gateway.server.once('error',error);gateway.server.listen(config.port,host,()=>{gateway.server.off('error',error);resolve()})});return gateway.server.address()},
 async stop(){stopping=true;gateway.stopAccepting();if(gateway.server.listening)await new Promise((resolve,reject)=>{gateway.server.close(e=>e?reject(e):resolve());gateway.server.closeIdleConnections()})}
 });
}
