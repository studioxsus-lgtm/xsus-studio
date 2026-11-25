import {mkdir,readFile,writeFile,rename,unlink,open} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {generateInteractiveWebsite} from './interactive.mjs';
export function createStorage(directory){
 const root=resolve(directory);
 const valid=id=>{if(typeof id!=='string'||!/^[a-z0-9_-]{1,80}$/.test(id))throw new TypeError('Invalid project identifier');return join(root,id+'.json')};
 async function read(id){const path=valid(id);try{return JSON.parse(await readFile(path,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}}
 async function save(id,input,options,expectedRevision=0){
  const path=valid(id);
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new TypeError('Invalid revision');
  const draft=generateInteractiveWebsite(input,options);
  await mkdir(root,{recursive:true,mode:0o700});
  const lock=await open(path+'.lock','wx',0o600);
  const temp=path+'.'+randomUUID()+'.tmp';
  try{
   const current=await read(id);
   if((current?.revision??0)!==expectedRevision)throw new Error('Revision conflict');
   const record={id,revision:expectedRevision+1,...draft};
   const data=JSON.stringify(record);
   if(Buffer.byteLength(data)>10_000_000)throw new Error('Project exceeds storage limit');
   await writeFile(temp,data,{flag:'wx',mode:0o600});
   await rename(temp,path);
   return record;
  }finally{try{await unlink(temp)}catch(e){if(e.code!=='ENOENT')throw e}finally{await lock.close();await unlink(path+'.lock')}}
 }
 return Object.freeze({read,save});
}
