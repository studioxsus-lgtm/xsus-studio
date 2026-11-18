import {createHmac,timingSafeEqual} from "node:crypto";
import {EngineContractError} from "../contracts.js";

const denied=code=>Object.freeze({state:"admission_ledger_integrity_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const own=(x,k)=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Unsafe ledger");
 const d=Object.getOwnPropertyDescriptor(x,k);
 if(!d||!("value" in d))throw Error("Unsafe ledger field");
 return d.value;
};
const seq=x=>Number.isSafeInteger(x)&&x>=0;
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const id=x=>typeof x==="string"&&/^[a-zA-Z0-9._-]{1,128}$/.test(x);
const keyOk=x=>Buffer.isBuffer(x)&&x.length>=32&&x.length<=4096;
const read=(ledger,maxIds)=>{
 const revision=own(ledger,"revision");
 const minimumSequence=own(ledger,"minimumSequence");
 const registryDigest=own(ledger,"registryDigest");
 const acceptedCheckpointIds=own(ledger,"acceptedCheckpointIds");
 if(!seq(revision)||!seq(minimumSequence)||!hex(registryDigest)||
  !Array.isArray(acceptedCheckpointIds)||acceptedCheckpointIds.length>maxIds)
  throw Error("Invalid ledger");
 const ids=[];
 const seen=new Set();
 for(let i=0;i<acceptedCheckpointIds.length;i++){
  const d=Object.getOwnPropertyDescriptor(acceptedCheckpointIds,String(i));
  if(!d||!("value" in d)||!id(d.value)||seen.has(d.value))
   throw Error("Invalid ledger ID");
  ids.push(d.value);seen.add(d.value);
 }
 // Canonicalize as a set: order changes alone do not change the commitment.
 ids.sort();
 return {revision,minimumSequence,registryDigest,ids};
};
const mac=(key,ledgerId,record)=>createHmac("sha256",key)
 .update(JSON.stringify(["XSUS_ADMISSION_LEDGER_INTEGRITY_V1",ledgerId,
  record.revision,record.minimumSequence,record.registryDigest,record.ids]))
 .digest("hex");
/**
 * Phase 75: authenticate the canonical content and identity of an admission
 * ledger. A trusted external store must persist the MAC and maintain a
 * monotonic revision/freshness floor outside the ledger's trust domain.
 * MAC verification alone cannot detect replay of an older valid snapshot.
 * No I/O, persistence, automatic acceptance or recovery.
 */
export function createReviewAdmissionLedgerIntegrityReceipt({
 ledger,ledgerId,key,maxAcceptedIds=10000
}={}){
 if(!id(ledgerId)||!keyOk(key)||!seq(maxAcceptedIds)||
  maxAcceptedIds<1||maxAcceptedIds>10000)
  throw new EngineContractError("INVALID_INPUT","Invalid admission ledger integrity configuration");
 try{
  const record=read(ledger,maxAcceptedIds);
  return Object.freeze({version:1,ledgerId,revision:record.revision,
   minimumSequence:record.minimumSequence,registryDigest:record.registryDigest,
   authenticationTag:mac(key,ledgerId,record)});
 }catch{
  throw new EngineContractError("INVALID_INPUT","Invalid admission ledger content");
 }
}
export function inspectReviewAdmissionLedgerIntegrity({
 ledger,ledgerId,receipt,key,minimumRevision=0,minimumSequence=0,
 maxAcceptedIds=10000
}={}){
 if(!id(ledgerId)||!keyOk(key)||!seq(minimumRevision)||
  !seq(minimumSequence)||!seq(maxAcceptedIds)||
  maxAcceptedIds<1||maxAcceptedIds>10000)
  throw new EngineContractError("INVALID_INPUT","Invalid admission ledger integrity configuration");
 try{
  const record=read(ledger,maxAcceptedIds);
  const version=own(receipt,"version"),rId=own(receipt,"ledgerId");
  const revision=own(receipt,"revision");
  const floor=own(receipt,"minimumSequence");
  const digest=own(receipt,"registryDigest");
  const tag=own(receipt,"authenticationTag");
  if(version!==1||!id(rId)||!seq(revision)||!seq(floor)||
   !hex(digest)||!hex(tag))return denied("LEDGER_RECEIPT_UNVERIFIED");
  const expected=Buffer.from(mac(key,rId,record),"hex");
  if(!timingSafeEqual(expected,Buffer.from(tag,"hex")))
   return denied("LEDGER_AUTHENTICATION_FAILED");
  if(rId!==ledgerId||revision!==record.revision||
   floor!==record.minimumSequence||digest!==record.registryDigest)
   return denied("LEDGER_RECEIPT_CONTEXT_MISMATCH");
  if(record.revision<minimumRevision||record.minimumSequence<minimumSequence)
   return denied("LEDGER_ROLLBACK_DETECTED");
  return Object.freeze({state:"admission_ledger_integrity_observed_for_manual_review",
   ledgerId,revision:record.revision,minimumSequence:record.minimumSequence,
   acceptedCount:record.ids.length,recoveryAuthorized:false,
   deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
   sideEffects:false,nextAction:"manual_review"});
 }catch{return denied("LEDGER_INTEGRITY_UNVERIFIED");}
}
