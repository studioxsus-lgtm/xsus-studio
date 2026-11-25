import {randomUUID} from 'node:crypto';
const types={string:v=>typeof v==='string'&&v.length<=10000,number:v=>typeof v==='number'&&Number.isFinite(v),boolean:v=>typeof v==='boolean'};
const identifier=s=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,62}$/.test(s)&&!['constructor','prototype','owner_id','id'].includes(s);
export function defineResource(name,fields){
 if(!identifier(name)||!fields||typeof fields!=='object'||Array.isArray(fields))throw new TypeError('Invalid resource');
 const entries=Object.entries(fields);
 if(!entries.length||entries.length>50)throw new TypeError('Invalid field count');
 for(const [key,type] of entries)if(!identifier(key)||!Object.hasOwn(types,type))throw new TypeError('Invalid field');
 return Object.freeze({name,fields:Object.freeze(Object.fromEntries(entries))});
}
export function createCrudRuntime(resource,{verifyIdentity}={}){
 const schema=defineResource(resource.name,resource.fields);
 if(typeof verifyIdentity!=='function')throw new TypeError('Identity verifier required');
 const records=new Map();
 async function owner(token){const principal=await verifyIdentity(token);if(!principal||typeof principal.id!=='string'||!principal.id.trim())throw new Error('Unauthorized');return principal.id}
 function validate(data,partial=false){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new TypeError('Invalid data');
  const entries=Object.entries(data);
  if(!entries.length||(!partial&&entries.length!==Object.keys(schema.fields).length))throw new TypeError('Missing fields');
  for(const [k,v] of entries)if(!Object.hasOwn(schema.fields,k)||!types[schema.fields[k]](v))throw new TypeError('Invalid field value');
  return Object.fromEntries(entries);
 }
 function find(id,user){const r=records.get(id);if(!r||r.owner!==user)throw new Error('Not found');return r}
 const view=r=>({id:r.id,...r.data});
 return Object.freeze({
  async create(token,data){const user=await owner(token);const r={id:randomUUID(),owner:user,data:validate(data)};records.set(r.id,r);return view(r)},
  async list(token){const user=await owner(token);return [...records.values()].filter(r=>r.owner===user).map(view)},
  async get(token,id){return view(find(id,await owner(token)))},
  async update(token,id,data){const r=find(id,await owner(token));r.data={...r.data,...validate(data,true)};return view(r)},
  async remove(token,id){find(id,await owner(token));records.delete(id);return true}
 });
}
export function planResource(name,fields){
 const schema=defineResource(name,fields);
 const sqlTypes={string:'text',number:'double precision',boolean:'boolean'};
 return {schema,storage:'postgresql',sql:'CREATE TABLE "'+name+'" (id uuid PRIMARY KEY, owner_id uuid NOT NULL, '+Object.entries(schema.fields).map(([k,t])=>'"'+k+'" '+sqlTypes[t]+' NOT NULL').join(', ')+');',routes:['POST /'+name,'GET /'+name,'GET /'+name+'/:id','PATCH /'+name+'/:id','DELETE /'+name+'/:id'],reviewRequired:true,executable:false,rlsConfigured:false};
}
