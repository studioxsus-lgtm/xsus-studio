/**
 * Hyper XSUS Core — Secure Reasoning Pipeline v0.6.0.
 * Server-side composition only. Caller MUST inject a context engine backed
 * by trusted per-scope authorization; do not use the legacy unscoped provider.
 * Claims resolver is trusted server code, not user-generated assertions.
 */
import {createKnowledgeReasoningEngine} from "./knowledge-reasoning.engine.js";
import {createKnowledgeInferenceReview} from "./knowledge-inference-review.engine.js";
import {createKnowledgeRuleExplanationEngine} from "./knowledge-rule-explanation.engine.js";
import {createKnowledgeDecisionEngine} from "./knowledge-decision.engine.js";
export const KNOWLEDGE_REASONING_PIPELINE_VERSION="0.6.0";
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const id=x=>typeof x==="string"&&x.length>0&&x.length<=200&&x.trim()===x;
const freeze=x=>{if(x&&typeof x==="object"&&!Object.isFrozen(x)){
 Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export function createSecureReasoningPipeline({
 contextEngine,resolveClaims,transitivePredicates=[],
 maxClaims=100,maxHops=3,maxPaths=1000,minEvidence=2,maxDecisions=100
}={}){
 if(!contextEngine||typeof contextEngine.build!=="function"||
  typeof resolveClaims!=="function")
  throw new TypeError("Trusted context engine and claim resolver required.");
 const reasoning=createKnowledgeReasoningEngine({maxClaims});
 const reviewEngine=createKnowledgeInferenceReview({transitivePredicates,maxHops,maxPaths});
 const explanationEngine=createKnowledgeRuleExplanationEngine({transitivePredicates});
 const decisionEngine=createKnowledgeDecisionEngine({minEvidence,maxHops,maxDecisions});
 let closed=false;
 async function run({query,language="en",authorization,limit}={}){
  if(closed)throw new Error("Secure reasoning pipeline is closed.");
  if(!plain(authorization)||!id(authorization.principalId)||!id(authorization.scope))
   throw Object.assign(new Error("Evidence access denied."),{
    code:"XSUS_EVIDENCE_ACCESS_DENIED"});
  if(typeof query!=="string"||!query.trim()||query.length>8000)
   throw new TypeError("Invalid query.");
  const request={query,language,authorization};
  if(limit!==undefined)request.limit=limit;
  // Authorization is checked by the injected context provider before this call returns.
  const context=await contextEngine.build(request);
  if(!plain(context)||!Array.isArray(context.evidence)||
   context.truncated!==false||context.query!==query.trim()||
   context.language!==language)
   throw new TypeError("Complete matching authorized context required.");
  const claims=await resolveClaims(Object.freeze({
   query:context.query,language:context.language,authorization:Object.freeze({
    principalId:authorization.principalId,scope:authorization.scope}),
   evidence:context.evidence
  }));
  const analysis=reasoning.analyze({context,claims});
  // Explicit contradictions are surfaced, not silently converted to decisions.
  if(analysis.contradictions.length)
   return freeze({version:KNOWLEDGE_REASONING_PIPELINE_VERSION,
    status:"explicit-conflicts",evidenceCount:context.evidence.length,
    contradictions:analysis.contradictions,decisions:[],
    summary:{eligible:0,needsReview:0,blocked:0}});
  const review=reviewEngine.review({analysis});
  // Partial graph exploration cannot be promoted into a definitive decision.
  if(review.truncated)
   return freeze({version:KNOWLEDGE_REASONING_PIPELINE_VERSION,
    status:"incomplete-review",evidenceCount:context.evidence.length,
    contradictions:[],decisions:[],
    summary:{eligible:0,needsReview:0,blocked:0}});
  const explanationResult=explanationEngine.explain({analysis,review});
  const decision=decisionEngine.decide({analysis,explanationResult});
  return freeze({version:KNOWLEDGE_REASONING_PIPELINE_VERSION,
   status:"reviewed",evidenceCount:context.evidence.length,
   contradictions:[],decisions:decision.decisions,summary:decision.summary});
 }
 return Object.freeze({version:KNOWLEDGE_REASONING_PIPELINE_VERSION,run,
  close(){closed=true;reasoning.close();reviewEngine.close();
   explanationEngine.close();decisionEngine.close();}});
}
