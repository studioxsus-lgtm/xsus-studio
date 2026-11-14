/**
 * Hyper XSUS Core — Audited Reasoning Facade v0.7.0.
 * Audit failures fail closed: never return unaudited decisions.
 * In-memory audit receipts are not durable compliance records.
 */
import {createKnowledgeDecisionAudit} from "./knowledge-decision-audit.engine.js";
export const AUDITED_REASONING_VERSION="0.7.0";
export function createAuditedReasoningPipeline({pipeline,maxEntries=1000}={}){
 if(!pipeline||typeof pipeline.run!=="function")
  throw new TypeError("Secure reasoning pipeline required.");
 const audit=createKnowledgeDecisionAudit({maxEntries});
 let closed=false;
 async function run(request){
  if(closed)throw new Error("Audited reasoning pipeline is closed.");
  const result=await pipeline.run(request);
  const receipt=audit.record({result});
  if(!audit.verify())throw new Error("Decision audit integrity failure.");
  return Object.freeze({result,receipt});
 }
 return Object.freeze({version:AUDITED_REASONING_VERSION,run,
  auditSnapshot:()=>audit.snapshot(),verifyAudit:()=>audit.verify(),
  close(){closed=true;audit.close();}});
}
