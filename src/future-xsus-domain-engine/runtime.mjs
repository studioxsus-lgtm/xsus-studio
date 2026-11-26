import {normalizeDomain,inspectDNS} from './index.mjs';
import {discoverDomain} from './rdap.mjs';
import {inspectDNSSEC} from './dnssec.mjs';
import {domainHealth} from './diagnostics.mjs';
import {inspectCertificate} from './tls.mjs';
import {scoreName,suggestNames} from './intelligence.mjs';
export const CONTRACT_VERSION='1.0.0';
export function createDomainRuntime({handlers={},maxConcurrent=8,maxPerMinute=30,maxAccounts=1000,clock=Date.now}={}){
 for(const n of [maxConcurrent,maxPerMinute,maxAccounts])if(!Number.isSafeInteger(n)||n<1)throw new TypeError('Invalid runtime limit');
 const routes=new Map(Object.entries({
 'domain.dns':p=>inspectDNS(p.domain),
 'domain.registration':p=>discoverDomain(p.domain),
 'domain.dnssec':p=>inspectDNSSEC(p.domain),
 'domain.health':p=>domainHealth(p.domain),
 'domain.certificate':p=>inspectCertificate(p.domain),
 'domain.score':p=>scoreName(p.domain),
 'domain.suggest':p=>suggestNames(p.words,{tld:p.tld,limit:p.limit}),
 ...handlers
 }));
 const windows=new Map();let active=0,completed=0,failed=0,rejected=0;
 const reject=(code)=>{rejected++;return {version:CONTRACT_VERSION,ok:false,error:{code}};};
 return Object.freeze({
 async execute(request,context){
 const account=context?.accountId;
 if(typeof account!=='string'||!account.trim()||account.length>128)return reject('UNAUTHORIZED');
 if(request?.version!==CONTRACT_VERSION||typeof request.operation!=='string'||!routes.has(request.operation)||!request.payload||typeof request.payload!=='object'||Array.isArray(request.payload))return reject('INVALID_REQUEST');
 let payload;
 try{payload=request.operation==='domain.suggest'?{words:request.payload.words,tld:request.payload.tld,limit:request.payload.limit}:{domain:normalizeDomain(request.payload.domain)};}catch{return reject('INVALID_PAYLOAD');}
 const now=clock();
 for(const [id,w] of windows)if(now-w.start>=60000)windows.delete(id);
 if(active>=maxConcurrent)return reject('BUSY');
 let w=windows.get(account);
 if(!w){if(windows.size>=maxAccounts)return reject('CAPACITY');w={start:now,count:0};windows.set(account,w);}
 if(w.count>=maxPerMinute)return reject('RATE_LIMITED');
 w.count++;active++;
 try{const data=await routes.get(request.operation)(payload);completed++;return {version:CONTRACT_VERSION,ok:true,operation:request.operation,data};}
 catch{failed++;return {version:CONTRACT_VERSION,ok:false,error:{code:'OPERATION_FAILED'}};}
 finally{active--;}
 },
 metrics(){return {active,completed,failed,rejected,trackedAccounts:windows.size};}
 });
}
