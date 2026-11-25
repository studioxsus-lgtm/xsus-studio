import {defineResource} from './backend.mjs';
const q=s=>'"'+s+'"';
const identifier=s=>typeof s==='string'&&/^[a-z][a-z0-9_]{0,30}$/.test(s);
export function planRelations(resources,relations){
 if(!Array.isArray(resources)||!resources.length||resources.length>30||!Array.isArray(relations)||relations.length>100)throw new TypeError('Invalid relations');
 const tables=new Map();
 for(const r of resources){const s=defineResource(r.name,r.fields);if(!identifier(s.name)||tables.has(s.name))throw new TypeError('Invalid table');tables.set(s.name,s)}
 const seen=new Set(),targets=new Set(),statements=[];
 for(const r of relations){
 if(!r||!tables.has(r.from)||!tables.has(r.to)||!identifier(r.field)||['id','owner_id'].includes(r.field)||Object.hasOwn(tables.get(r.from).fields,r.field)||!['restrict','cascade'].includes(r.onDelete??'restrict'))throw new TypeError('Invalid relation');
 const key=r.from+'.'+r.field;if(seen.has(key))throw new TypeError('Duplicate relation');seen.add(key);
 if(!targets.has(r.to)){statements.push('ALTER TABLE '+q(r.to)+' ADD UNIQUE ("owner_id", "id");');targets.add(r.to)}
 statements.push('ALTER TABLE '+q(r.from)+' ADD COLUMN '+q(r.field)+' uuid;');
 statements.push('ALTER TABLE '+q(r.from)+' ADD FOREIGN KEY ("owner_id", '+q(r.field)+') REFERENCES '+q(r.to)+' ("owner_id", "id") ON DELETE '+(r.onDelete??'restrict').toUpperCase()+';');
 statements.push('CREATE INDEX ON '+q(r.from)+' ("owner_id", '+q(r.field)+');');
 }
 return {sql:['BEGIN;',...statements,'COMMIT;'].join('\n'),reviewRequired:true,executable:false};
}
export async function withTransaction(pool,work){
 if(typeof pool?.connect!=='function'||typeof work!=='function')throw new TypeError('Invalid transaction adapters');
 const client=await pool.connect();
 let begun=false,discard=false;
 try{await client.query('BEGIN');begun=true;const result=await work((sql,args)=>client.query(sql,args));await client.query('COMMIT');begun=false;return result}
 catch(error){if(begun){try{await client.query('ROLLBACK')}catch{discard=true}}else discard=true;throw error}
 finally{client.release(discard)}
}
