import {exportDocument,importDocument} from './export.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateId(id){if(typeof id!=='string'||!uuid.test(id))throw new TypeError('Invalid project ID');return id}
function payload(name,document){if(typeof name!=='string'||!name.trim()||name.trim().length>120)throw new TypeError('Invalid name');return {name:name.trim(),document:JSON.parse(exportDocument(document,{format:'json',maxBytes:1900000}).content)}}
function result(r){if(r.error)throw new Error('Project storage request failed');if(!r.data)throw new Error('Project unavailable or revision conflict');return r.data}
export function createProjectStorage(client){async function owner(){const {data,error}=await client.auth.getUser();if(error||!data?.user?.id)throw new Error('Authentication required');return data.user.id}const table=()=>client.from('logo_projects');return {
async list(){const id=await owner();return result(await table().select('id,name,revision,created_at,updated_at').eq('owner_id',id).order('updated_at',{ascending:false}).limit(100))},
async create(name,document){await owner();return result(await table().insert(payload(name,document)).select().single())},
async open(id){const user=await owner();const row=result(await table().select().eq('owner_id',user).eq('id',validateId(id)).maybeSingle());return {...row,document:importDocument(JSON.stringify(row.document))}},
async save(id,revision,name,document){if(!Number.isSafeInteger(revision)||revision<1)throw new TypeError('Invalid revision');const user=await owner();return result(await table().update(payload(name,document)).eq('owner_id',user).eq('id',validateId(id)).eq('revision',revision).select().maybeSingle())},
async remove(id,revision){if(!Number.isSafeInteger(revision)||revision<1)throw new TypeError('Invalid revision');const user=await owner();return result(await table().delete().eq('owner_id',user).eq('id',validateId(id)).eq('revision',revision).select('id').maybeSingle())}
}}
