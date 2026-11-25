import {defineResource} from './backend.mjs';
const quote=k=>'"'+k+'"';
export function compileQuery(resource,owner,{filters={},search='',sort='id',direction='asc',limit=50,offset=0}={}){
 const schema=defineResource(resource.name,resource.fields),fields=Object.keys(schema.fields);
 if(typeof owner!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner))throw new TypeError('Invalid owner');
 if(!filters||typeof filters!=='object'||Array.isArray(filters)||typeof search!=='string'||search.length>500||!['id',...fields].includes(sort)||!['asc','desc'].includes(direction)||!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>1000000)throw new TypeError('Invalid query');
 const args=[owner],where=['"owner_id" = $1'];
 for(const [k,v] of Object.entries(filters)){
 if(!Object.hasOwn(schema.fields,k)||typeof v!==schema.fields[k]||(typeof v==='number'&&!Number.isFinite(v))||(typeof v==='string'&&v.length>10000))throw new TypeError('Invalid filter');
 args.push(v);where.push(quote(k)+' = $'+args.length);
 }
 if(search){const strings=fields.filter(k=>schema.fields[k]==='string');if(!strings.length)throw new TypeError('No searchable fields');args.push(search);where.push('('+strings.map(k=>'strpos(lower('+quote(k)+'), lower($'+args.length+')) > 0').join(' OR ')+')')}
 args.push(limit,offset);
 const sql='SELECT '+['id',...fields].map(quote).join(', ')+' FROM '+quote(schema.name)+' WHERE '+where.join(' AND ')+' ORDER BY '+quote(sort)+' '+direction.toUpperCase()+(sort==='id'?'':', "id" ASC')+' LIMIT $'+(args.length-1)+' OFFSET $'+args.length;
 return {sql,args};
}
export function createSearchRuntime(resource,{query,verifyIdentity}={}){
 const schema=defineResource(resource.name,resource.fields);
 if(typeof query!=='function'||typeof verifyIdentity!=='function')throw new TypeError('Adapters required');
 return Object.freeze({async list(token,options){const p=await verifyIdentity(token);if(!p||typeof p.id!=='string')throw new Error('Unauthorized');const {sql,args}=compileQuery(schema,p.id,options);const result=await query(sql,args);if(!Array.isArray(result?.rows))throw new Error('Invalid database response');return result.rows}});
}
