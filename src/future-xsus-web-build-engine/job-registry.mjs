import {mkdir,readFile,open,rename,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
export async function openJobRegistry({directory,maxJobs=1000,clock=Date.now}={}){
 if(typeof directory!=='string'||!directory||!Number.isInteger(maxJobs)||maxJobs<1||maxJobs>10000||typeof clock!=='function')throw TypeError('Invalid registry configuration');
 const root=resolve(directory),path=join(root,'jobs.json');await mkdir(root,{recursive:true,mode:0o700});
 let records=[];try{records=JSON.parse(await readFile(path,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 const validId=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/.test(x);
 const states=['queued','running','completed','failed','cancelled','interrupted'];
 if(!Array.isArray(records)||records.length>maxJobs||new Set(records.map(r=>r.id)).size!==records.length||records.some(r=>!validId(r.id)||typeof r.owner!=='string'||!r.owner||!states.includes(r.status)||!Number.isSafeInteger(r.revision)||r.revision<0))throw Error('Invalid registry');
 let chain=Promise.resolve();
 async function persist(next){const temp=join(root,randomUUID()+'.tmp');let h;try{h=await open(temp,'wx',0o600);await h.writeFile(JSON.stringify(next));await h.sync();await h.close();h=null;await rename(temp,path);records=next}finally{if(h)await h.close();await rm(temp,{force:true})}}
 function mutate(fn){const task=chain.then(async()=>{const next=structuredClone(records),result=fn(next);await persist(next);return structuredClone(result)});chain=task.catch(()=>{});return task}
 if(records.some(r=>r.status==='running'))await mutate(next=>{for(const r of next)if(r.status==='running'){r.status='interrupted';r.revision++;r.updatedAt=clock()}});
 const allowed={queued:['running','cancelled'],running:['completed','failed','interrupted'],completed:[],failed:[],cancelled:[],interrupted:[]};
 return Object.freeze({
 create(owner){if(typeof owner!=='string'||!owner||owner.length>200)throw TypeError('Invalid owner');return mutate(next=>{if(next.length>=maxJobs)throw Error('Registry capacity exceeded');const r={id:randomUUID(),owner,status:'queued',revision:0,updatedAt:clock(),artifactId:null};next.push(r);return r})},
 transition(owner,id,revision,status,artifactId=null){return mutate(next=>{const r=next.find(x=>x.id===id&&x.owner===owner);if(!r)throw Error('Not found');if(r.revision!==revision)throw Error('Revision conflict');if(!allowed[r.status].includes(status))throw Error('Invalid transition');if(status==='completed'?!validId(artifactId):artifactId!==null)throw Error('Invalid artifact');Object.assign(r,{status,artifactId,revision:r.revision+1,updatedAt:clock()});return r})},
 async get(owner,id){await chain;const r=records.find(x=>x.owner===owner&&x.id===id);if(!r)throw Error('Not found');return structuredClone(r)},
 async list(owner){await chain;return structuredClone(records.filter(r=>r.owner===owner))}
 });
}
