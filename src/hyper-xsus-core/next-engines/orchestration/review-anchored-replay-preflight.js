import {readFile,lstat,readdir} from "node:fs/promises";
import {basename,dirname} from "node:path";
import {createHash} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {withExclusiveFileLock} from "../../knowledge-graph/integration/exclusive-file-lock.js";
import {verifyReviewReplayRollbackAnchor} from "./review-replay-rollback-anchor.js";

const blocked=code=>Object.freeze({state:"anchored_replay_blocked",
 findings:Object.freeze([code]),recoveryAuthorized:false,deletionAuthorized:false,
 retrySafe:false,executionAuthorized:false,sideEffects:false,
 nextAction:"manual_investigation"});
const digest=ids=>createHash("sha256").update(JSON.stringify([1,ids])).digest("hex");
const validDigest=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
/**
 * Phase 64: read-only, lock-scoped integration of persistent replay registry
 * and an independently trusted anchor provider. No bootstrap, writes or
 * automatic recovery. The caller must not treat this as a transaction or as
 * permission to append to the registry: trusted anchor updates require an
 * external atomic/monotonic protocol.
 */
export function createAnchoredReplayPreflight({
 filePath,anchorProvider,key,minimumSequence=0,maxReceipts=1024
}={}){
 if(typeof filePath!=="string"||!filePath.trim()||
  typeof anchorProvider!=="function"||!Buffer.isBuffer(key)||key.length<32||
  key.length>4096||!Number.isSafeInteger(minimumSequence)||
  minimumSequence<0||!Number.isSafeInteger(maxReceipts)||
  maxReceipts<1||maxReceipts>100000)
  throw new EngineContractError("INVALID_INPUT","Invalid anchored replay preflight");
 const secret=Buffer.from(key);
 async function inspect(){
  try{
   return await withExclusiveFileLock(filePath,async()=>{
    const names=await readdir(dirname(filePath));
    if(names.some(x=>x.startsWith(basename(filePath)+".")&&x.endsWith(".tmp")))
     return blocked("INTERRUPTED_REGISTRY_WRITE");
    const before=await lstat(filePath);
    if(!before.isFile()||before.size>maxReceipts*80+128)
     return blocked("REGISTRY_UNVERIFIED");
    const raw=await readFile(filePath,"utf8");
    const after=await lstat(filePath);
    if(!after.isFile()||before.dev!==after.dev||before.ino!==after.ino||
     before.size!==after.size||before.mtimeMs!==after.mtimeMs)
     return blocked("REGISTRY_CHANGED");
    const data=JSON.parse(raw);
    if(data?.version!==1||!Array.isArray(data.ids)||
     data.ids.length>maxReceipts||data.ids.some(x=>!validDigest(x))||
     new Set(data.ids).size!==data.ids.length||data.digest!==digest(data.ids))
     return blocked("REGISTRY_UNVERIFIED");
    // An anchor must be provisioned independently. Missing anchors fail closed.
    const anchor=await anchorProvider();
    const verification=verifyReviewReplayRollbackAnchor({
     anchor,registryDigest:data.digest,minimumSequence,key:secret});
    if(verification.state!=="rollback_anchor_verified")
     return blocked(verification.findings[0]??"ANCHOR_UNVERIFIED");
    // Re-read the registry after external anchor I/O to detect common races.
    const latest=await lstat(filePath);
    if(!latest.isFile()||latest.dev!==after.dev||latest.ino!==after.ino||
     latest.size!==after.size||latest.mtimeMs!==after.mtimeMs)
     return blocked("REGISTRY_CHANGED");
    return Object.freeze({state:"anchored_replay_observed",
     sequence:verification.sequence,registryDigest:data.digest,
     receiptCount:data.ids.length,recoveryAuthorized:false,
     deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
     sideEffects:false,nextAction:"manual_review"});
   });
  }catch{return blocked("ANCHORED_PREFLIGHT_UNVERIFIED");}
 }
 return Object.freeze({inspect});
}
