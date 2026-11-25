import {defineResource} from './backend.mjs';
import {randomUUID} from 'node:crypto';
const validators={string:v=>typeof v==='string'&&v.length<=10000,number:v=>typeof v==='number'&&Number.isFinite(v),boolean:v=>typeof v==='boolean'};
export function createDatabaseRuntime(resource,{query,verifyIdentity}={}){
 const schema=defineResource(resource.name,resource.fields);
 if(typeof query!=='function'||typeof verifyIdentity!=='function')throw new TypeError('Database and identity adapters required');
 const table='"'+schema.name+'"',fields=Object.keys(schema.fields),projection=['id',...fields].map(k=>'"'+k+'"').join(', ');
 async function owner(token){const p=await verifyIdentity(token);if(!p||typeof p.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id))throw new Error('Unauthorized');return p.id}
 function validate(data,partial=false){if(!data||typeof data!=='object'||Array.isArray(data))throw new TypeError('Invalid data');const entries=Object.entries(data);if(!entries.length||(!partial&&entries.length!==fields.length))throw new TypeError('Missing fields');for(const [k,v] of entries)if(!Object.hasOwn(schema.fields,k)||!validators[schema.fields[k]](v))throw new TypeError('Invalid field');return entries}
 const one=result=>{if(!result.rows.length)throw new Error('Not found');return result.rows[0]};
 return Object.freeze({
 async create(token,data){const user=await owner(token),entries=validate(data),values=[randomUUID(),user,...entries.map(e=>e[1])];return one(await query('INSERT INTO '+table+' ("id", "owner_id", '+entries.map(e=>'"'+e[0]+'"').join(', ')+') VALUES ('+values.map((_,i)=>'$'+(i+1)).join(', ')+') RETURNING '+projection,values))},
 async list(token){return (await query('SELECT '+projection+' FROM '+table+' WHERE owner_id = $1 ORDER BY id',[await owner(token)])).rows},
 async get(token,id){return one(await query('SELECT '+projection+' FROM '+table+' WHERE owner_id = $1 AND id = $2',[await owner(token),id]))},
 async update(token,id,data){const user=await owner(token),entries=validate(data,true);return one(await query('UPDATE '+table+' SET '+entries.map(([k],i)=>'"'+k+'" = $'+(i+3)).join(', ')+' WHERE owner_id = $1 AND id = $2 RETURNING '+projection,[user,id,...entries.map(e=>e[1])]))},
 async remove(token,id){const result=await query('DELETE FROM '+table+' WHERE owner_id = $1 AND id = $2 RETURNING id',[await owner(token),id]);one(result);return true}
 });
}
