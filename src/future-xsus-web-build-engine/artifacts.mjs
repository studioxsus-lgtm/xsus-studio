import {mkdir,readFile,rename,rm,open,readdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {buildArchive} from './build.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function createArtifactStorage({directory,verifyIdentity,maxBytes=20000000,maxTotalBytes=100000000,maxOwnerBytes=30000000}={}){
 if(typeof directory!=='string'||!directory||typeof verifyIdentity!=='function'||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>25000000)throw TypeError('Invalid storage configuration');
 if(!Number.isSafeInteger(maxTotalBytes)||!Number.isSafeInteger(maxOwnerBytes)||maxOwnerBytes<1||maxTotalBytes<maxOwnerBytes)throw TypeError('Invalid quota');
 const root=resolve(directory);
 let chain=Promise.resolve();
 function serialized(fn){const task=chain.then(fn);chain=task.catch(()=>{});return task}
 async function usage(o){let total=0,owned=0;for(const dir of await readdir(root,{withFileTypes:true})){if(!dir.isDirectory()||!/^[a-f0-9]{64}$/.test(dir.name))continue;for(const file of await readdir(join(root,dir.name),{withFileTypes:true})){if(!file.isFile())continue;const size=(await stat(join(root,dir.name,file.name))).size;total+=size;if(dir.name===o)owned+=size}}return {total,owned}}
 async function owner(token){const i=await verifyIdentity(token);if(!i||typeof i.id!=='string'||!i.id||i.id.length>200)throw Error('Unauthorized');return hash(i.id)}
 function locate(o,id){if(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))throw TypeError('Invalid artifact id');return join(root,o,id+'.json')}
 return Object.freeze({
 async save(token,project){const o=await owner(token);return serialized(async()=>{const built=buildArchive(project),archive=built.archive;if(!Buffer.isBuffer(archive)||archive.length>maxBytes)throw Error('Artifact too large');const id=randomUUID(),target=locate(o,id),temp=target+'.tmp';await mkdir(join(root,o),{recursive:true,mode:0o700});const record={id,sha256:hash(archive),bytes:archive.length,data:archive.toString('base64'),publicationAuthorized:false};const encoded=JSON.stringify(record),size=Buffer.byteLength(encoded),used=await usage(o);if(size>maxTotalBytes-used.total||size>maxOwnerBytes-used.owned)throw Error('Quota exceeded');let handle;try{handle=await open(temp,'wx',0o600);await handle.writeFile(encoded);await handle.sync();await handle.close();handle=null;await rename(temp,target)}finally{if(handle)await handle.close();await rm(temp,{force:true})}return {id,sha256:record.sha256,bytes:record.bytes,publicationAuthorized:false}})},
 async read(token,id){const o=await owner(token);let raw;try{raw=await readFile(locate(o,id))}catch(e){if(e.code==='ENOENT')throw Error('Not found');throw e}if(raw.length>Math.ceil(maxBytes*4/3)+1024)throw Error('Invalid artifact');const r=JSON.parse(raw),archive=Buffer.from(r.data,'base64');if(r.id!==id||r.publicationAuthorized!==false||archive.length!==r.bytes||archive.length>maxBytes||hash(archive)!==r.sha256)throw Error('Artifact integrity failure');return {archive,sha256:r.sha256,bytes:r.bytes,publicationAuthorized:false}},
 async remove(token,id){const o=await owner(token);return serialized(async()=>{try{await rm(locate(o,id));return true}catch(e){if(e.code==='ENOENT')return false;throw e}})}
 });
}
