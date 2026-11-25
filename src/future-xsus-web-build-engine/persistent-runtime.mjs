import {openJobRegistry} from './job-registry.mjs';
import {createArtifactStorage} from './artifacts.mjs';
import {join} from 'node:path';
export async function createPersistentRuntime({directory,verifyIdentity,generate,maxJobs=1000,maxConcurrent=2,generationTimeoutMs=60000}={}){
 if(typeof directory!=='string'||!directory||typeof verifyIdentity!=='function'||typeof generate!=='function'||!Number.isInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>100)throw TypeError('Invalid runtime configuration');
 if(!Number.isSafeInteger(generationTimeoutMs)||generationTimeoutMs<1||generationTimeoutMs>600000)throw TypeError('Invalid generation timeout');
 const registry=await openJobRegistry({directory:join(directory,'registry'),maxJobs});
 const storage=createArtifactStorage({directory:join(directory,'artifacts'),verifyIdentity});
 let active=0,pending=0;
 async function identity(token){const i=await verifyIdentity(token);if(!i||typeof i.id!=='string'||!i.id||i.id.length>200)throw Error('Unauthorized');return i.id}
 return Object.freeze({
 async generate(token,input){
 const owner=await identity(token);
 if(!input||typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>12000||typeof input.name!=='string'||!input.name.trim()||input.name.length>120||!['en','sq','fr'].includes(input.language??'en'))throw TypeError('Invalid input');
 if(active>=maxConcurrent||pending>=maxConcurrent)throw Error('Generation capacity exceeded');active++;
 let job,artifact;
 try{job=await registry.create(owner);job=await registry.transition(owner,job.id,job.revision,'running');
 const controller=new AbortController();let timer;
 pending++;
 const work=Promise.resolve().then(()=>generate({prompt:input.prompt,name:input.name,language:input.language??'en'}, {signal:controller.signal})).finally(()=>{pending--});
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('Generation timeout'));controller.abort()},generationTimeoutMs)});
 let result;try{result=await Promise.race([work,deadline])}finally{clearTimeout(timer)}
 if(result?.status!=='draft'||result.publicationAuthorized!==false)throw Error('Draft unavailable');
 artifact=await storage.save(token,result.result.project);
 try{job=await registry.transition(owner,job.id,job.revision,'completed',artifact.id)}catch(e){await storage.remove(token,artifact.id).catch(()=>{});throw e}
 return {job,artifact,publicationAuthorized:false};
 }catch(e){if(job?.status==='running')await registry.transition(owner,job.id,job.revision,'failed');throw e}finally{active--}
 },
 async get(token,id){return registry.get(await identity(token),id)},
 async list(token){return registry.list(await identity(token))},
 async download(token,id){const job=await registry.get(await identity(token),id);if(job.status!=='completed')throw Error('Artifact unavailable');return storage.read(token,job.artifactId)},
 cleanupTemporary:()=>storage.cleanupTemporary(),
 diagnostics:()=>({active,maxConcurrent,pending})
 });
}
