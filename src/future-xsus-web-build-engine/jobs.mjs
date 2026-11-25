import {randomUUID} from 'node:crypto';
export function createGenerationJobs({generate,verifyIdentity,clock=Date.now,maxJobs=100,maxConcurrent=2,ttlMs=3600000}={}){
 if(typeof generate!=='function'||typeof verifyIdentity!=='function'||typeof clock!=='function'||!Number.isInteger(maxJobs)||maxJobs<1||maxJobs>1000||!Number.isInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>maxJobs||!Number.isInteger(ttlMs)||ttlMs<1||ttlMs>86400000)throw TypeError('Invalid job configuration');
 const jobs=new Map();let active=0;
 async function owner(token){const i=await verifyIdentity(token);if(!i||typeof i.id!=='string'||!i.id||i.id.length>200)throw Error('Unauthorized');return i.id}
 function sweep(){for(const [id,j] of jobs)if(j.finishedAt!==null&&clock()-j.finishedAt>=ttlMs)jobs.delete(id)}
 function snapshot(j){return {id:j.id,status:j.status,createdAt:j.createdAt,finishedAt:j.finishedAt,publicationAuthorized:false}}
 function pump(){while(active<maxConcurrent){const j=[...jobs.values()].find(x=>x.status==='queued');if(!j)return;j.status='running';active++;Promise.resolve().then(()=>generate(j.input)).then(result=>{const encoded=JSON.stringify(result);if(!encoded||Buffer.byteLength(encoded)>10000000)throw Error('Invalid result');j.result=JSON.parse(encoded);j.status='completed'}).catch(()=>{j.status='failed'}).finally(()=>{j.input=null;j.finishedAt=clock();active--;pump()})}}
 return Object.freeze({
 async submit(token,input){const idOwner=await owner(token);sweep();if(jobs.size>=maxJobs)throw Error('Job capacity exceeded');if(!input||typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>12000||typeof input.name!=='string'||!input.name.trim()||input.name.length>120||!['en','sq','fr'].includes(input.language??'en'))throw TypeError('Invalid job input');const j={id:randomUUID(),owner:idOwner,input:{prompt:input.prompt,name:input.name,language:input.language??'en'},status:'queued',createdAt:clock(),finishedAt:null};jobs.set(j.id,j);pump();return snapshot(j)},
 async get(token,id){const o=await owner(token);sweep();const j=jobs.get(id);if(!j||j.owner!==o)throw Error('Not found');return snapshot(j)},
 async result(token,id){const o=await owner(token);sweep();const j=jobs.get(id);if(!j||j.owner!==o)throw Error('Not found');if(j.status!=='completed')throw Error('Result unavailable');return structuredClone(j.result)},
 async cancel(token,id){const o=await owner(token);sweep();const j=jobs.get(id);if(!j||j.owner!==o)throw Error('Not found');if(j.status!=='queued')throw Error('Job not queued');j.status='cancelled';j.input=null;j.finishedAt=clock();return snapshot(j)},
 diagnostics(){sweep();return {active,queued:[...jobs.values()].filter(j=>j.status==='queued').length,total:jobs.size}}
 });
}
