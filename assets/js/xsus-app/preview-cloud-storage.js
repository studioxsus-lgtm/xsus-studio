import {getSupabaseClient} from './auth-session.js';

const TABLE='xsus_generated_app_data';
const PREFIX='xsus-app:preview-records:v2:';
const pending=new Map();
const timers=new Map();
let identityPromise=null;
async function identity(){
 if(!identityPromise)identityPromise=(async()=>{
  const client=await getSupabaseClient();
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user?.id)return null;
  return {client,owner:data.user.id};
 })().catch(()=>null).finally(()=>{identityPromise=null;});
 return identityPromise;
}
function valid(key,value){
 return typeof key==='string'&&key.startsWith(PREFIX)&&key.length<=120&&
 value&&typeof value==='object'&&!Array.isArray(value)&&JSON.stringify(value).length<=100000;
}
export async function loadPreviewCloudData(key){
 if(typeof key!=='string'||!key.startsWith(PREFIX))return null;
 const session=await identity();
 if(!session)return null;
 const {data,error}=await session.client.from(TABLE).select('payload').eq('owner_id',session.owner).eq('app_key',key).maybeSingle();
 if(error)throw error;
 return valid(key,data?.payload)?data.payload:null;
}
export function queuePreviewCloudSave(key,payload){
 if(!valid(key,payload))return;
 pending.set(key,JSON.stringify(payload));
 clearTimeout(timers.get(key));
 timers.set(key,setTimeout(()=>void flush(key),850));
}
async function flush(key){
 timers.delete(key);
 const json=pending.get(key);
 if(!json)return;
 try{
  const session=await identity();
  if(!session)return;
  const {error}=await session.client.from(TABLE).upsert({
   owner_id:session.owner,app_key:key,payload:JSON.parse(json),updated_at:new Date().toISOString()
  },{onConflict:'owner_id,app_key'});
  if(error)throw error;
  if(pending.get(key)===json)pending.delete(key);
 }catch(error){console.warn('[xsus-preview-cloud-save]',error?.message||'unavailable');}
}
