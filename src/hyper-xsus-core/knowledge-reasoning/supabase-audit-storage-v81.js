/**
 * Hyper XSUS Core v8.1 — Supabase REST append-only audit storage boundary.
 * This is a storage primitive, NOT a replacement for v5.7 signed snapshots,
 * v6.0 trusted anchors, or v8.0 recovery assurance.
 * Requires server-side credentials and database-enforced immutable rows.
 */
export const SUPABASE_AUDIT_STORAGE_VERSION="8.1.0";
const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(code){return Object.assign(new Error(code),{code});}
export function createSupabaseAuditStorage({
 url,key,fetchImpl=fetch,table="xsus_hyper_audit_v81"
}={}){
 if(typeof url!=="string"||!/^https:\/\/[^/\s]+$/.test(url)||
  typeof key!=="string"||!key.trim()||typeof fetchImpl!=="function"||
  table!=="xsus_hyper_audit_v81")
  throw new TypeError("Trusted Supabase URL, server key, fetch and fixed audit table required.");
 const endpoint=url+"/rest/v1/"+table;
 async function request(method,path,body){
  const response=await fetchImpl(endpoint+path,{
   method,headers:{apikey:key,Authorization:"Bearer "+key,
    Accept:"application/json",...(body?{"Content-Type":"application/json",
    Prefer:"return=representation"}:{})},
   ...(body?{body:JSON.stringify(body)}:{}),
   signal:AbortSignal.timeout(10000),redirect:"error",cache:"no-store"
  });
  if(!response.ok)throw fail("XSUS_SUPABASE_AUDIT_UNAVAILABLE");
  let rows;
  try{rows=await response.json();}catch{throw fail("XSUS_SUPABASE_AUDIT_INVALID_RESPONSE");}
  if(!Array.isArray(rows))throw fail("XSUS_SUPABASE_AUDIT_INVALID_RESPONSE");
  return rows;
 }
 function validate(row){
  if(!row||typeof row!=="object"||Array.isArray(row)||
   !UUID.test(row.event_id)||!Number.isSafeInteger(row.sequence)||row.sequence<1||
   !HEX.test(row.previous_hash)||!HEX.test(row.entry_hash)||
   typeof row.payload!=="object"||row.payload===null||Array.isArray(row.payload))
   throw fail("XSUS_SUPABASE_AUDIT_INVALID_ROW");
  return Object.freeze({event_id:row.event_id,sequence:row.sequence,
   previous_hash:row.previous_hash,entry_hash:row.entry_hash,
   payload:structuredClone(row.payload)});
 }
 async function append(row){
  const validated=validate(row);
  // Database RPC serializes writers and validates the expected chain head.
  // Direct table inserts are intentionally not used.
  const response=await fetchImpl(url+"/rest/v1/rpc/xsus_hyper_append_v811",{
   method:"POST",
   headers:{apikey:key,Authorization:"Bearer "+key,
    Accept:"application/json","Content-Type":"application/json"},
   body:JSON.stringify({p_event_id:validated.event_id,
    p_sequence:validated.sequence,p_previous_hash:validated.previous_hash,
    p_entry_hash:validated.entry_hash,p_payload:validated.payload}),
   signal:AbortSignal.timeout(10000),redirect:"error",cache:"no-store"
  });
  if(!response.ok)throw fail("XSUS_SUPABASE_AUDIT_UNAVAILABLE");
  let rows;
  try{rows=await response.json();}catch{throw fail("XSUS_SUPABASE_AUDIT_INVALID_RESPONSE");}
  if(!Array.isArray(rows))throw fail("XSUS_SUPABASE_AUDIT_INVALID_RESPONSE");
  if(rows.length!==1)throw fail("XSUS_SUPABASE_AUDIT_UNCERTAIN");
  const stored=validate(rows[0]);
  if(JSON.stringify(stored)!==JSON.stringify(validated))
   throw fail("XSUS_SUPABASE_AUDIT_UNCERTAIN");
  return stored;
 }
 async function list(){
  const rows=await request("GET",
   "?select=event_id,sequence,previous_hash,entry_hash,payload&order=sequence.asc");
  const result=rows.map(validate);
  for(let i=0;i<result.length;i++){
   if(result[i].sequence!==i+1||
    (i>0&&result[i].previous_hash!==result[i-1].entry_hash))
    throw fail("XSUS_SUPABASE_AUDIT_CHAIN_GAP");
  }
  return Object.freeze(result);
 }
 return Object.freeze({version:SUPABASE_AUDIT_STORAGE_VERSION,append,list});
}
