export function createCoreTransport({futureUrl,hyperUrl,getToken,fetchImpl=globalThis.fetch,timeoutMs=10000,maxBytes=1048576}={}){
 const endpoint=value=>{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search)throw TypeError('Invalid core endpoint');return u.href};
 const urls={future:endpoint(futureUrl),hyper:endpoint(hyperUrl)};
 if(typeof getToken!=='function'||typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<10||timeoutMs>60000||!Number.isInteger(maxBytes)||maxBytes<1024||maxBytes>4194304)throw TypeError('Invalid transport configuration');
 async function request(core,payload){
 if(!payload||payload.contractVersion!=='1.0.0'||payload.executionAllowed!==false)throw TypeError('Invalid request contract');
 const body=JSON.stringify(payload);if(Buffer.byteLength(body)>maxBytes)throw Error('Request too large');
 const controller=new AbortController();let timer;
 try{return await Promise.race([new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Core timeout'))},timeoutMs)}),(async()=>{
 const token=await getToken(core);if(typeof token!=='string'||!token||token.length>8192||/\s/.test(token))throw Error('Core authentication unavailable');
 if(controller.signal.aborted)throw Error('Core timeout');
 const response=await fetchImpl(urls[core],{method:'POST',redirect:'error',credentials:'omit',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},body,signal:controller.signal});
 if(!response.ok)throw Error('Core request failed: '+response.status);
 if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||''))throw Error('Invalid response type');
 const reader=response.body?.getReader();if(!reader)throw Error('Missing response body');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){controller.abort();throw Error('Response too large')}chunks.push(Buffer.from(value))}}finally{reader.releaseLock()}
 const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(!result||result.contractVersion!=='1.0.0')throw Error('Invalid response contract');return result;
 })()])}finally{clearTimeout(timer)}
 }
 return Object.freeze({interpret:payload=>request('future',payload),plan:payload=>request('hyper',payload)});
}
