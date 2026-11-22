export const EXECUTION_AUDIT_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const HEX=/^[a-f0-9]{64}$/;
const STATES=new Set(["registered","running","completed","failed","recovering","cleaned"]);
const ZERO="0".repeat(64);
function canonical(e){return JSON.stringify([e.version,e.executionId,e.sequence,e.revision,e.fence,e.from,e.to,e.timestamp,e.previousHash]);}
function valid(e){
 return e&&e.version===EXECUTION_AUDIT_VERSION&&typeof e.executionId==="string"&&ID.test(e.executionId)&&Number.isSafeInteger(e.sequence)&&e.sequence>=1&&Number.isSafeInteger(e.revision)&&e.revision>=1&&Number.isSafeInteger(e.fence)&&e.fence>=1&&(e.from===null||STATES.has(e.from))&&STATES.has(e.to)&&Number.isSafeInteger(e.timestamp)&&e.timestamp>=0&&typeof e.previousHash==="string"&&HEX.test(e.previousHash)&&typeof e.hash==="string"&&HEX.test(e.hash);
}
export function createExecutionAudit({digest,appendAtomic,readEvents,clock=()=>Date.now()}={}){
 if(typeof digest!=="function"||typeof appendAtomic!=="function"||typeof readEvents!=="function"||typeof clock!=="function")throw new TypeError("Trusted audit dependencies required");
 async function verify(executionId){
  if(typeof executionId!=="string"||!ID.test(executionId))throw new TypeError("Invalid audit execution ID");
  const events=await readEvents(executionId);
  if(!Array.isArray(events))throw new TypeError("Invalid audit event history");
  let previousHash=ZERO,previous=null;
  for(const event of events){
   if(!valid(event)||event.executionId!==executionId||event.sequence!==(previous?.sequence??0)+1||event.previousHash!==previousHash||event.revision!==(previous?.revision??0)+1||event.fence!==(previous?.fence??0)+1||event.from!==(previous?.to??null))throw new Error("Audit integrity violation");
   const calculated=await digest(canonical(event));
   if(typeof calculated!=="string"||!HEX.test(calculated)||calculated!==event.hash)throw new Error("Audit digest mismatch");
   previousHash=event.hash;previous=event;
  }
  return Object.freeze({verified:true,count:events.length,headHash:previousHash,last:previous?Object.freeze({...previous}):null});
 }
 return Object.freeze({
  verify,
  async record({executionId,revision,fence,from,to}={}){
   if(typeof executionId!=="string"||!ID.test(executionId)||!STATES.has(to)||!(from===null||STATES.has(from))||!Number.isSafeInteger(revision)||revision<1||!Number.isSafeInteger(fence)||fence<1)throw new TypeError("Invalid audit transition");
   const history=await verify(executionId);
   if(revision!==history.count+1||fence!==(history.last?.fence??0)+1||from!==(history.last?.to??null))throw new Error("Audit transition conflict");
   const timestamp=clock();
   if(!Number.isSafeInteger(timestamp)||timestamp<0)throw new TypeError("Invalid audit timestamp");
   const event={version:EXECUTION_AUDIT_VERSION,executionId,sequence:history.count+1,revision,fence,from,to,timestamp,previousHash:history.headHash};
   const hash=await digest(canonical(event));
   if(typeof hash!=="string"||!HEX.test(hash))throw new TypeError("Invalid audit digest");
   const entry=Object.freeze({...event,hash});
   if(await appendAtomic(executionId,history.headHash,entry)!==true)throw new Error("Concurrent audit append");
   return entry;
  }
 });
}
