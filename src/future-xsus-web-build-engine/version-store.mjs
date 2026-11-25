import {mkdir,readFile,writeFile,rename,unlink,open} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createSourceEditor} from './source-editor.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
export function createVersionStore({directory,verifyIdentity,maxVersions=20}={}){
 if(typeof directory!=='string'||!directory||typeof verifyIdentity!=='function'||!Number.isInteger(maxVersions)||maxVersions<1||maxVersions>50)throw TypeError('Invalid version store');
 const root=resolve(directory);
 async function location(token,id){const user=await verifyIdentity(token);if(typeof user?.id!=='string'||!user.id)throw Error('Unauthorized');if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw TypeError('Invalid project id');return join(root,hash(user.id),id+'.json')}
 async function read(path){let raw;try{raw=await readFile(path,'utf8')}catch(e){if(e.code==='ENOENT')return {revision:0,versions:[]};throw e}const data=JSON.parse(raw);if(!Number.isSafeInteger(data.revision)||!Array.isArray(data.versions)||data.versions.length>maxVersions)throw Error('Invalid history');for(const v of data.versions)if(hash(JSON.stringify(v.files))!==v.sha256)throw Error('Integrity failure');return data}
 async function mutate(path,expected,work){await mkdir(resolve(path,'..'),{recursive:true,mode:0o700});const lock=await open(path+'.lock','wx',0o600);const temp=path+'.'+randomUUID()+'.tmp';try{const data=await read(path);if(data.revision!==expected)throw Error('Revision conflict');const files=createSourceEditor(work(data)).snapshot().files;const entry={revision:data.revision+1,files,sha256:hash(JSON.stringify(files))};const next={revision:entry.revision,versions:[...data.versions,entry].slice(-maxVersions)};const raw=JSON.stringify(next);if(Buffer.byteLength(raw)>30000000)throw Error('History quota exceeded');await writeFile(temp,raw,{flag:'wx',mode:0o600});await rename(temp,path);return {revision:entry.revision,sha256:entry.sha256,publicationAuthorized:false}}finally{try{await unlink(temp)}catch(e){if(e.code!=='ENOENT')throw e}finally{await lock.close();await unlink(path+'.lock')}}}
 return Object.freeze({
 async save(token,id,files,expected){const copy=createSourceEditor(files).snapshot().files;return mutate(await location(token,id),expected,()=>copy)},
 async list(token,id){const d=await read(await location(token,id));return {revision:d.revision,versions:d.versions.map(({revision,sha256})=>({revision,sha256}))}},
 async get(token,id,revision){const d=await read(await location(token,id));const v=d.versions.find(x=>x.revision===revision);if(!v)throw Error('Version not found');return {...v,publicationAuthorized:false}},
 async restore(token,id,revision,expected){return mutate(await location(token,id),expected,d=>{const v=d.versions.find(x=>x.revision===revision);if(!v)throw Error('Version not found');return v.files})}
 });
}
