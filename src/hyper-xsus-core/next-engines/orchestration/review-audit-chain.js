import {createHash} from "node:crypto";
import {EngineContractError} from "../contracts.js";
import {compareReviewAuditContinuity} from "./review-audit-continuity.js";

const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const blocked=Object.freeze({state:"chain_blocked",recoveryAuthorized:false,
 deletionAuthorized:false,retrySafe:false,executionAuthorized:false,
 sideEffects:false,nextAction:"manual_investigation"});
/**
 * Phase 57 — bounded read-only continuity chain.
 * This is an observation digest, not an authenticated signature or
 * an atomic journal snapshot. No recovery or retry permission is implied.
 */
export function verifyReviewAuditChain({snapshots,maxSnapshots=16}={}){
 if(!Array.isArray(snapshots)||snapshots.length<2||
  !Number.isSafeInteger(maxSnapshots)||maxSnapshots<2||maxSnapshots>32||
  snapshots.length>maxSnapshots)
  throw new EngineContractError("INVALID_INPUT","Invalid audit snapshot chain");
 const links=[];
 const findings=[];
 let previousHash="0".repeat(64);
 for(let i=1;i<snapshots.length;i++){
  let comparison;
  try{comparison=compareReviewAuditContinuity({
   before:snapshots[i-1],after:snapshots[i]});
  }catch{comparison=null;}
  const valid=comparison?.state==="continuity_observed";
  if(!valid)findings.push("CHAIN_LINK_UNVERIFIED");
  const linkHash=hash([i,previousHash,comparison?.beforeFingerprint??null,
   comparison?.afterFingerprint??null,valid]);
  links.push(Object.freeze({index:i,previousHash,linkHash,
   state:valid?"continuity_observed":"continuity_blocked",
   recoveryAuthorized:false,executionAuthorized:false,retrySafe:false}));
  previousHash=linkHash;
 }
 return Object.freeze({...blocked,
  state:findings.length===0?"chain_observed":"chain_blocked",
  headFingerprint:previousHash,findings:Object.freeze([...new Set(findings)]),
  links:Object.freeze(links),
  nextAction:findings.length===0?"manual_review":"manual_investigation"});
}
