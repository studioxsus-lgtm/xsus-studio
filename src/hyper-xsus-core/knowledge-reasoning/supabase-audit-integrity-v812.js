/**
 * Hyper XSUS Core v8.1.2 — authenticated Supabase audit chain verifier.
 * HMAC-SHA256 binds the sequence, previous hash and JSON payload.
 * A separately protected checkpoint/anchor is still required for rollback detection.
 * Server-only: never ship the signing key to the browser.
 */
import {createHmac,timingSafeEqual} from "node:crypto";

export const SUPABASE_AUDIT_INTEGRITY_VERSION="8.1.2";
const ZERO="0".repeat(64);
const HEX=/^[a-f0-9]{64}$/;
const fail=code=>Object.assign(new Error(code),{code});
const stable=value=>{
 if(value===null||typeof value!=="object")return JSON.stringify(value);
 if(Array.isArray(value))return "["+value.map(stable).join(",")+"]";
 return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+stable(value[k])).join(",")+"}";
};
export function createSupabaseAuditIntegrity({key,keyId,storage}={}){
 if(!(typeof key==="string"||Buffer.isBuffer(key))||Buffer.byteLength(key)<32||
  typeof keyId!=="string"||!/^[A-Za-z0-9._-]{1,128}$/.test(keyId)||
  !storage||typeof storage.list!=="function")
  throw new TypeError("Independent 32+ byte signing key, key ID and audit reader required.");
 const secret=Buffer.from(key);
 const hash=(sequence,previous_hash,payload)=>createHmac("sha256",secret)
  .update(stable(["xsus-hyper-supabase-audit-v812",keyId,sequence,previous_hash,payload]))
  .digest("hex");
 function check(row,expectedSequence,previous){
  if(!row||row.sequence!==expectedSequence||row.previous_hash!==previous||
   typeof row.entry_hash!=="string"||!HEX.test(row.entry_hash)||
   !row.payload||typeof row.payload!=="object"||Array.isArray(row.payload))
   throw fail("XSUS_SUPABASE_AUDIT_INTEGRITY");
  let expected;
  try{expected=hash(row.sequence,row.previous_hash,row.payload);}
  catch{throw fail("XSUS_SUPABASE_AUDIT_INTEGRITY");}
  if(!timingSafeEqual(Buffer.from(row.entry_hash,"hex"),Buffer.from(expected,"hex")))
   throw fail("XSUS_SUPABASE_AUDIT_INTEGRITY");
 }
 async function verify(){
  const rows=await storage.list();
  if(!Array.isArray(rows))throw fail("XSUS_SUPABASE_AUDIT_INTEGRITY");
  let tip=ZERO;
  for(let i=0;i<rows.length;i++){
   check(rows[i],i+1,tip);
   tip=rows[i].entry_hash;
  }
  return Object.freeze({version:SUPABASE_AUDIT_INTEGRITY_VERSION,
   verified:true,count:rows.length,tip});
 }
 function signEntry({sequence,previous_hash,payload}={}){
  if(!Number.isSafeInteger(sequence)||sequence<1||
   typeof previous_hash!=="string"||!HEX.test(previous_hash)||
   !payload||typeof payload!=="object"||Array.isArray(payload))
   throw fail("XSUS_SUPABASE_AUDIT_INVALID_ROW");
  let copy;
  try{copy=structuredClone(payload);}catch{throw fail("XSUS_SUPABASE_AUDIT_INVALID_ROW");}
  return Object.freeze({sequence,previous_hash,payload:copy,
   entry_hash:hash(sequence,previous_hash,copy)});
 }
 return Object.freeze({version:SUPABASE_AUDIT_INTEGRITY_VERSION,signEntry,verify});
}
