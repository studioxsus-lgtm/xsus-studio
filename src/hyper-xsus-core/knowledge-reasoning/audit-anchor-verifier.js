/**
 * Hyper XSUS Core — Audit Anchor Verification v1.6.0.
 * Produces signed checkpoints for storage OUTSIDE the journal's trust boundary.
 * This module does not persist anchors or manage signing keys.
 */
import {createHmac,timingSafeEqual} from "node:crypto";

export const AUDIT_ANCHOR_VERSION="1.6.0";
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const validSequence=x=>Number.isSafeInteger(x)&&x>=0;
const fail=(message,code="XSUS_AUDIT_ANCHOR_INVALID")=>
 Object.assign(new Error(message),{code});
function validateSnapshot(snapshot){
 if(!snapshot||typeof snapshot!=="object"||!Array.isArray(snapshot.entries)||
  !validSequence(snapshot.lastSequence)||
  !(snapshot.anchorHash==="GENESIS"||hex(snapshot.anchorHash)))
  throw fail("Invalid audit snapshot.");
 if(snapshot.entries.length){
  const last=snapshot.entries.at(-1);
  if(!last||!validSequence(last.sequence)||last.sequence!==snapshot.lastSequence||
   !hex(last.hash))throw fail("Invalid audit tip.");
 }else if(snapshot.lastSequence!==0&&snapshot.anchorHash==="GENESIS")
  throw fail("Invalid empty audit snapshot.");
 return {sequence:snapshot.lastSequence,tipHash:snapshot.entries.length?
  snapshot.entries.at(-1).hash:snapshot.anchorHash};
}
function validateAnchor(anchor){
 if(!anchor||typeof anchor!=="object"||Array.isArray(anchor)||
  Object.keys(anchor).sort().join(",")!=="algorithm,keyId,sequence,signature,tipHash,version"||
  anchor.version!==AUDIT_ANCHOR_VERSION||anchor.algorithm!=="HMAC-SHA256"||
  typeof anchor.keyId!=="string"||!/^[A-Za-z0-9._-]{1,128}$/.test(anchor.keyId)||
  !validSequence(anchor.sequence)||
  !(anchor.tipHash==="GENESIS"&&anchor.sequence===0||hex(anchor.tipHash))||
  !hex(anchor.signature))
  throw fail("Invalid audit anchor.");
}
export function createAuditAnchorVerifier({key,keyId}={}){
 if(!(typeof key==="string"||Buffer.isBuffer(key))||
  Buffer.byteLength(key)<32||typeof keyId!=="string"||
  !/^[A-Za-z0-9._-]{1,128}$/.test(keyId))
  throw new TypeError("Audit anchoring requires a 32-byte secret and valid key ID.");
 const secret=Buffer.from(key);
 const sign=(sequence,tipHash)=>{
  const message=JSON.stringify([AUDIT_ANCHOR_VERSION,keyId,sequence,tipHash]);
  return createHmac("sha256",secret).update(message).digest("hex");
 };
 function createAnchor(snapshot){
  const {sequence,tipHash}=validateSnapshot(snapshot);
  return Object.freeze({version:AUDIT_ANCHOR_VERSION,algorithm:"HMAC-SHA256",
   keyId,sequence,tipHash,signature:sign(sequence,tipHash)});
 }
 function verifyAnchor(snapshot,anchor){
  validateAnchor(anchor);
  if(anchor.keyId!==keyId)throw fail("Unexpected anchor key ID.");
  const expected=Buffer.from(sign(anchor.sequence,anchor.tipHash),"hex");
  if(!timingSafeEqual(expected,Buffer.from(anchor.signature,"hex")))
   throw fail("Audit anchor signature mismatch.","XSUS_AUDIT_ANCHOR_SIGNATURE");
  const current=validateSnapshot(snapshot);
  if(current.sequence<anchor.sequence)
   throw fail("Audit rollback against external anchor.","XSUS_AUDIT_ANCHOR_ROLLBACK");
  if(current.sequence===anchor.sequence&&current.tipHash!==anchor.tipHash)
   throw fail("Audit fork against external anchor.","XSUS_AUDIT_ANCHOR_FORK");
  if(current.sequence>anchor.sequence){
   const matching=snapshot.entries.find(e=>e.sequence===anchor.sequence);
   const observable=matching?.hash??(
    snapshot.entries.length&&snapshot.entries[0].sequence===anchor.sequence+1?
     snapshot.anchorHash:null);
   if(observable===null)
    throw fail("Anchor sequence is outside verifiable retention.",
     "XSUS_AUDIT_ANCHOR_UNVERIFIABLE");
   if(observable!==anchor.tipHash)
    throw fail("Audit fork against external anchor.","XSUS_AUDIT_ANCHOR_FORK");
  }
  return true;
 }
 return Object.freeze({version:AUDIT_ANCHOR_VERSION,createAnchor,verifyAnchor});
}
