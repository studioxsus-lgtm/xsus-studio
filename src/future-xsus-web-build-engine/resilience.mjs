import {randomUUID} from 'node:crypto';
export function createResilientTransport(transport,{threshold=3,cooldownMs=30000,maxConcurrent=8,clock=Date.now}={}){
 if(!transport||typeof transport.interpret!=='function'||typeof transport.plan!=='function'||typeof clock!=='function'||!Number.isInteger(threshold)||threshold<1||threshold>20||!Number.isInteger(cooldownMs)||cooldownMs<1||cooldownMs>3600000||!Number.isInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>100)throw TypeError('Invalid resilience configuration');
 const states=Object.fromEntries(['interpret','plan'].map(k=>[k,{failures:0,openedAt:null,active:0,probe:false,successes:0,errors:0,lastDurationMs:null,lastRequestId:null,epoch:0}]));
 async function invoke(key,payload){
 const s=states[key],now=clock();
 if(s.openedAt!==null&&(now-s.openedAt<cooldownMs||s.probe))throw Error('Core circuit open');
 if(s.active>=maxConcurrent)throw Error('Core capacity exceeded');
 const probe=s.openedAt!==null;if(probe)s.probe=true;
 const epoch=s.epoch,id=randomUUID();s.active++;
 try{const result=await transport[key](payload);s.successes++;if(s.epoch===epoch){s.failures=0;s.openedAt=null;if(probe)s.epoch++}return result}
 catch(error){s.errors++;if(s.epoch===epoch){s.failures++;if(probe||s.failures>=threshold){s.openedAt=clock();s.epoch++}}throw error}
 finally{s.active--;if(probe)s.probe=false;s.lastDurationMs=Math.max(0,clock()-now);s.lastRequestId=id}
 }
 return Object.freeze({interpret:p=>invoke('interpret',p),plan:p=>invoke('plan',p),diagnostics:()=>Object.fromEntries(Object.entries(states).map(([k,s])=>[k,{state:s.openedAt===null?'closed':clock()-s.openedAt>=cooldownMs?'half_open':'open',active:s.active,failures:s.failures,successes:s.successes,errors:s.errors,lastDurationMs:s.lastDurationMs,lastRequestId:s.lastRequestId}]))});
}
