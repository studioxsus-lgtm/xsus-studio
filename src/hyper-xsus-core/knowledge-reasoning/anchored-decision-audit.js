/**
 * Hyper XSUS Core — Opt-in anchored audit lifecycle v1.8.0.
 * Requires an independently provisioned checkpoint; never bootstraps one.
 */
import {createPersistentDecisionAudit} from "./persistent-decision-audit.engine.js";
import {createAuditAnchorStore} from "./audit-anchor-store.js";

export const ANCHORED_DECISION_AUDIT_VERSION="1.8.0";
export function createAnchoredDecisionAudit({audit,anchorStore,...options}={}){
 const journal=audit??createPersistentDecisionAudit(options);
 const anchor=anchorStore??createAuditAnchorStore(options.anchorOptions);
 if(!journal||!["load","append","snapshot","close"].every(k=>typeof journal[k]==="function")||
  !anchor||typeof anchor.verify!=="function")
  throw new TypeError("Invalid anchored audit dependencies.");
 let loaded=false,closed=false,failed=false;
 let queue=Promise.resolve();
 const unavailable=()=>new Error("Anchored audit unavailable.");
 async function load(){
  if(loaded||closed||failed)throw unavailable();
  try{
   const snapshot=await journal.load();
   await anchor.verify(snapshot);
   loaded=true;
   return snapshot;
  }catch(e){failed=true;throw e;}
 }
 function append(input){
  const job=queue.then(async()=>{
   if(!loaded||closed||failed)throw unavailable();
   try{
    // Verify a trusted external checkpoint before and after each commit.
    // The underlying journal still owns locking and durability.
    await anchor.verify(journal.snapshot());
    const entry=await journal.append(input);
    await anchor.verify(journal.snapshot());
    return entry;
   }catch(e){failed=true;throw e;}
  });
  queue=job.catch(()=>{});
  return job;
 }
 function snapshot(){
  if(!loaded||closed||failed)throw unavailable();
  return journal.snapshot();
 }
 return Object.freeze({version:ANCHORED_DECISION_AUDIT_VERSION,
  load,append,snapshot,close(){closed=true;journal.close();}});
}
