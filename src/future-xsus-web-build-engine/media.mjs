import {randomUUID,createHash} from 'node:crypto';
const formats={
 'image/png':b=>b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
 'image/jpeg':b=>b.length>=4&&b[0]===255&&b[1]===216&&b[2]===255&&b[b.length-2]===255&&b[b.length-1]===217,
 'image/webp':b=>b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP',
 'video/mp4':b=>b.length>=12&&b.toString('ascii',4,8)==='ftyp'
};
const hash=b=>createHash('sha256').update(b).digest('hex');
export function createMediaRuntime({verifyIdentity,storage,maxBytes=10000000,maxAssets=1000}={}){
 if(typeof verifyIdentity!=='function'||!storage||!['put','get','remove'].every(k=>typeof storage[k]==='function')||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>50000000||!Number.isInteger(maxAssets)||maxAssets<1||maxAssets>10000)throw TypeError('Invalid configuration');
 const records=new Map();let pending=0;
 async function owner(token){const p=await verifyIdentity(token);if(!p||typeof p.id!=='string'||!p.id)throw Error('Unauthorized');return p.id}
 function find(user,id){const r=records.get(id);if(!r||r.owner!==user||r.deleting)throw Error('Not found');return r}
 const publicRecord=({owner,deleting,...r})=>({...r});
 return Object.freeze({
 async upload(token,{name,mime,bytes}){const user=await owner(token);if(typeof name!=='string'||!name.trim()||name.length>200||/[\\/\u0000-\u001f]/.test(name)||!Object.hasOwn(formats,mime)||!Buffer.isBuffer(bytes)||bytes.length>maxBytes||!formats[mime](bytes))throw TypeError('Invalid media');if(records.size+pending>=maxAssets)throw Error('Capacity reached');const data=Buffer.from(bytes),id=randomUUID(),r={id,owner:user,name,mime,size:data.length,sha256:hash(data)};pending++;try{await storage.put(id,data);records.set(id,r);return publicRecord(r)}finally{pending--}},
 async list(token){const user=await owner(token);return [...records.values()].filter(r=>r.owner===user&&!r.deleting).map(publicRecord)},
 async read(token,id){const r=find(await owner(token),id),bytes=await storage.get(id);if(!Buffer.isBuffer(bytes)||bytes.length!==r.size||hash(bytes)!==r.sha256)throw Error('Integrity failure');return {metadata:publicRecord(r),bytes:Buffer.from(bytes)}},
 async remove(token,id){const r=find(await owner(token),id);r.deleting=true;try{await storage.remove(id);records.delete(id)}catch(e){r.deleting=false;throw e}}
 });
}
