/**
 * Hyper XSUS Core v8.1.5 — independently stored, signed checkpoint protocol.
 * Storage must enforce atomic compare-and-swap and durable persistence.
 * This module does not provide that storage or authorize recovery.
 */
import {createHmac,timingSafeEqual} from "node:crypto";
export const TRUSTED_CHECKPOINT_VERSION="8.1.5";
const HEX=/^[a-f0-9]{64}$/;
const ZERO="0".repeat(64);
const fail=code=>Object.assign(new Error(code),{code});
const canonical=(count,tip,keyId)=>JSON.stringify(["xsus-hyper-checkpoint-v815",keyId,count,tip]);
export function createTrustedCheckpointProtocol({
 key,keyId,readCheckpoint,compareAndSwap
}={}){
 if(!(typeof key==="string"||Buffer.isBuffer(key))||Buffer.byteLength(key)<32||
  typeof keyId!=="string"||!/^[A-Za-z0-9._-]{1,128}$/.test(keyId)||
  typeof readCheckpoint!=="function"||typeof compareAndSwap!=="function")
  throw new TypeError("Independent signing key, key ID and trusted CAS storage required.");
 const secret=Buffer.from(key);
 function mac(count,tip){
  return createHmac("sha256",secret).update(canonical(count,tip,keyId)).digest("hex");
 }
 function validate(record){
  if(!record||!Number.isSafeInteger(record.count)||record.count<0||
   typeof record.tip!=="string"||!HEX.test(record.tip)||
   typeof record.signature!=="string"||!HEX.test(record.signature)||
   record.keyId!==keyId||(record.count===0&&record.tip!==ZERO))
   throw fail("XSUS_CHECKPOINT_INVALID");
  const expected=mac(record.count,record.tip);
  if(!timingSafeEqual(Buffer.from(record.signature,"hex"),Buffer.from(expected,"hex")))
   throw fail("XSUS_CHECKPOINT_INVALID");
  return Object.freeze({count:record.count,tip:record.tip,
   keyId:record.keyId,signature:record.signature});
 }
 function sign(count,tip){
  if(!Number.isSafeInteger(count)||count<0||typeof tip!=="string"||
   !HEX.test(tip)||(count===0&&tip!==ZERO))
   throw fail("XSUS_CHECKPOINT_INVALID");
  return Object.freeze({count,tip,keyId,signature:mac(count,tip)});
 }
 async function read(){
  const stored=await readCheckpoint();
  return validate(stored);
 }
 async function advance({expected,next,verifiedAudit}={}){
  const previous=validate(expected);
  const target=validate(next);
  if(target.count!==previous.count+1||target.tip===previous.tip||
   !verifiedAudit||verifiedAudit.verified!==true||
   verifiedAudit.count!==target.count||verifiedAudit.tip!==target.tip)
   throw fail("XSUS_CHECKPOINT_ADVANCE_DENIED");
  const current=await read();
  if(current.count!==previous.count||current.tip!==previous.tip||
   current.signature!==previous.signature)
   throw fail("XSUS_CHECKPOINT_CONFLICT");
  const accepted=await compareAndSwap({expected:previous,next:target});
  if(accepted!==true)throw fail("XSUS_CHECKPOINT_CONFLICT");
  const confirmed=await read();
  if(confirmed.count!==target.count||confirmed.tip!==target.tip||
   confirmed.signature!==target.signature)
   throw fail("XSUS_CHECKPOINT_UNCONFIRMED");
  return Object.freeze({count:confirmed.count,tip:confirmed.tip,verified:true,
   recoveryAuthorized:false});
 }
 return Object.freeze({version:TRUSTED_CHECKPOINT_VERSION,sign,read,advance});
}
