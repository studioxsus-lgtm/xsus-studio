/**
 * Hyper XSUS Core v8.1.6 — remote durable checkpoint CAS transport.
 * Configure with a separately administered Supabase project and credentials.
 * Same-project storage does NOT provide independent rollback protection.
 * No implicit genesis initialization or recovery authorization.
 */
export const CHECKPOINT_STORAGE_VERSION="8.1.6";
const HEX=/^[a-f0-9]{64}$/;
const fail=code=>Object.assign(new Error(code),{code});
const valid=r=>r&&Number.isSafeInteger(r.count)&&r.count>=0&&
 typeof r.tip==="string"&&HEX.test(r.tip)&&
 typeof r.signature==="string"&&HEX.test(r.signature)&&
 typeof r.keyId==="string"&&/^[A-Za-z0-9._-]{1,128}$/.test(r.keyId);
export function createRemoteCheckpointStorage({url,key,fetchImpl=fetch}={}){
 if(typeof url!=="string"||!/^https:\/\/[^/\s]+$/.test(url)||
  typeof key!=="string"||!key.trim()||typeof fetchImpl!=="function")
  throw new TypeError("Trusted independent checkpoint endpoint, key and transport required.");
 async function call(path,options={}){
  let response;
  try{
   response=await fetchImpl(url+"/rest/v1/"+path,{
    method:options.body?"POST":"GET",
    headers:{apikey:key,Authorization:"Bearer "+key,Accept:"application/json",
     ...(options.body?{"Content-Type":"application/json"}:{})},
    ...(options.body?{body:JSON.stringify(options.body)}:{}),
    signal:AbortSignal.timeout(10000),redirect:"error",cache:"no-store"
   });
  }catch{throw fail("XSUS_CHECKPOINT_STORAGE_UNAVAILABLE");}
  if(!response?.ok)throw fail("XSUS_CHECKPOINT_STORAGE_UNAVAILABLE");
  try{return await response.json();}
  catch{throw fail("XSUS_CHECKPOINT_STORAGE_INVALID_RESPONSE");}
 }
 async function readCheckpoint(){
  const rows=await call("xsus_hyper_checkpoint_v816?select=count,tip,signature,keyId&id=eq.1");
  if(!Array.isArray(rows)||rows.length!==1||!valid(rows[0]))
   throw fail("XSUS_CHECKPOINT_STORAGE_INVALID_RESPONSE");
  return Object.freeze(structuredClone({
   count:rows[0].count,tip:rows[0].tip,
   signature:rows[0].signature,keyId:rows[0].keyId
  }));
 }
 async function compareAndSwap({expected,next}={}){
  if(!valid(expected)||!valid(next)||next.count!==expected.count+1)
   throw fail("XSUS_CHECKPOINT_STORAGE_INVALID_RECORD");
  const result=await call("rpc/xsus_hyper_checkpoint_cas_v816",{
   body:{p_expected_count:expected.count,p_expected_tip:expected.tip,
    p_expected_signature:expected.signature,p_expected_key_id:expected.keyId,
    p_next_count:next.count,p_next_tip:next.tip,
    p_next_signature:next.signature,p_next_key_id:next.keyId}
  });
  if(typeof result!=="boolean")
   throw fail("XSUS_CHECKPOINT_STORAGE_INVALID_RESPONSE");
  return result;
 }
 return Object.freeze({version:CHECKPOINT_STORAGE_VERSION,readCheckpoint,compareAndSwap});
}
