export function createProjects(client){
 const table='logo_projects';
 const fields='id,name,document,revision,updated_at';
 const owner=async()=>{const {data,error}=await client.auth.getUser();if(error||!data?.user?.id)throw Error('authentication_required');return data.user.id};
 const unwrap=({data,error})=>{if(error)throw Error('project_storage_failed');return data};
 const nameOf=name=>{if(typeof name!=='string'||!name.trim()||name.trim().length>120)throw Error('invalid_name');return name.trim()};
 const documentOf=document=>{if(!document||typeof document!=='object'||Array.isArray(document)||document.version!=='1.0.0'||!Array.isArray(document.layers)||document.layers.length>256||new TextEncoder().encode(JSON.stringify(document)).length>1900000)throw Error('invalid_document');return document};
 const check=(id,revision)=>{if(typeof id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!Number.isSafeInteger(revision)||revision<1)throw Error('invalid_project')};
 return Object.freeze({
 async list(){const uid=await owner();return unwrap(await client.from(table).select('id,name,revision,updated_at').eq('owner_id',uid).order('updated_at',{ascending:false}).limit(100))},
 async open(id){check(id,1);const uid=await owner();const row=unwrap(await client.from(table).select(fields).eq('owner_id',uid).eq('id',id).maybeSingle());if(!row)throw Error('project_not_found');documentOf(row.document);return row},
 async create(name,document){await owner();return unwrap(await client.from(table).insert({name:nameOf(name),document:documentOf(document)}).select(fields).single())},
 async save(id,revision,name,document){check(id,revision);const uid=await owner();const row=unwrap(await client.from(table).update({name:nameOf(name),document:documentOf(document)}).eq('owner_id',uid).eq('id',id).eq('revision',revision).select(fields).maybeSingle());if(!row)throw Error('project_conflict');return row},
 async remove(id,revision){check(id,revision);const uid=await owner();const row=unwrap(await client.from(table).delete().eq('owner_id',uid).eq('id',id).eq('revision',revision).select('id').maybeSingle());if(!row)throw Error('project_conflict');return row.id}
 });
}
