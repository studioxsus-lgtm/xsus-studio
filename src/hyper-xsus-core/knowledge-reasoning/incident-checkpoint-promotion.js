/**
 * Hyper XSUS Core v3.9 — independently authorized checkpoint promotion.
 * Does not provide its own trusted storage, remove locks or repair archives.
 */
export const INCIDENT_PROMOTION_VERSION="3.9.0";
const fail=(code,message)=>Object.assign(new Error(message),{code});
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const hex=/^[a-f0-9]{64}$/;
const validMark=x=>x&&valid(x.count)&&typeof x.tip==="string"&&hex.test(x.tip)&&
 (x.count!==0||x.tip==="0".repeat(64));
export function createIncidentCheckpointPromotion({guard,archive,checkpoint,authorize,readiness}={}){
 if(!guard||typeof guard.inspect!=="function"||!archive||typeof archive.verify!=="function"||
 !checkpoint||typeof checkpoint.read!=="function"||typeof checkpoint.advance!=="function"||
 typeof authorize!=="function")
 throw new TypeError("Guard, authenticated archive, independent CAS checkpoint and reviewer required.");
 if(readiness!==undefined&&typeof readiness!=="function")throw new TypeError("Readiness must be a function.");
 async function requireReady(){
  if(!readiness)return;
  const state=await readiness();
  if(!state||!Array.isArray(state.blockers))
   throw fail("XSUS_INCIDENT_PROMOTION_READINESS_BLOCKED","Invalid readiness assessment.");
  if(state.blockers.length===1&&state.blockers[0]==="UNANCHORED_ARCHIVE_TAIL")return;
  if(state.blockers.includes("CHECKPOINT_WRITER_LOCK_REVIEW_REQUIRED"))
   throw fail("XSUS_CHECKPOINT_LOCKED","Concurrent or interrupted checkpoint writer.");
  if(state.blockers.includes("ARCHIVE_WRITER_LOCK_REVIEW_REQUIRED")||
   state.blockers.length===0)
   throw fail("XSUS_INCIDENT_PROMOTION_BLOCKED","Only a verified, unanchored tail may be promoted.");
  throw fail("XSUS_INCIDENT_PROMOTION_READINESS_BLOCKED","Recovery residue prevents promotion.");
 }
 let busy=false;
 async function promote(){
  if(busy)throw fail("XSUS_INCIDENT_PROMOTION_BUSY","Promotion already in progress.");
  busy=true;
  try{
   await requireReady();
   const before=await checkpoint.read();
   if(!validMark(before))throw fail("XSUS_INCIDENT_CHECKPOINT_INVALID","Malformed checkpoint.");
   const assessment=await guard.inspect();
   if(!assessment||!Array.isArray(assessment.blockers)||
    assessment.blockers.some(b=>b!=="UNANCHORED_ARCHIVE_TAIL")||
    assessment.archiveCount<=before.count||assessment.trustedCount!==before.count||
    assessment.trustedTip!==before.tip||assessment.blockers.length!==1)
    throw fail("XSUS_INCIDENT_PROMOTION_BLOCKED","Only a verified, unanchored tail may be promoted.");
   const verified=await archive.verify();
   if(!verified||!valid(verified.count)||!Array.isArray(verified.entries)||
    verified.entries.length!==verified.count||verified.count!==assessment.archiveCount||
    verified.tip!==assessment.archiveTip||
    verified.entries.some((e,i)=>e?.sequence!==i+1||typeof e.signature!=="string"||!hex.test(e.signature))||
    (before.count>0&&verified.entries[before.count-1].signature!==before.tip))
    throw fail("XSUS_INCIDENT_PROMOTION_FORK","Archive no longer matches trusted prefix.");
   const next=Object.freeze({count:verified.count,tip:verified.tip});
   const approved=await authorize(Object.freeze({previous:Object.freeze({...before}),next,assessment}));
   if(approved!==true)throw fail("XSUS_INCIDENT_PROMOTION_DENIED","Explicit reviewer authorization required.");
   await requireReady();
   const again=await guard.inspect();
   if(JSON.stringify(again)!==JSON.stringify(assessment))
    throw fail("XSUS_INCIDENT_PROMOTION_CHANGED","Assessment changed before CAS.");
   const now=await checkpoint.read();
   if(now.count!==before.count||now.tip!==before.tip)
    throw fail("XSUS_INCIDENT_PROMOTION_CHANGED","Trusted checkpoint changed before CAS.");
   const current=await archive.verify();
   if(current.count!==verified.count||current.tip!==verified.tip||
    !Array.isArray(current.entries)||current.entries.length!==verified.entries.length||
    current.entries.some((e,i)=>e.signature!==verified.entries[i].signature))
    throw fail("XSUS_INCIDENT_PROMOTION_CHANGED","Archive changed before CAS.");
   await checkpoint.advance(Object.freeze({...before}),next);
   const persisted=await checkpoint.read();
   if(persisted.count!==next.count||persisted.tip!==next.tip)
    throw fail("XSUS_INCIDENT_PROMOTION_UNCERTAIN","Checkpoint CAS outcome cannot be confirmed.");
   return Object.freeze({version:INCIDENT_PROMOTION_VERSION,status:"promoted",previous:Object.freeze({...before}),next});
  }finally{busy=false;}
 }
 return Object.freeze({version:INCIDENT_PROMOTION_VERSION,promote});
}
