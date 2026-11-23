export const DURABLE_RUNTIME_SUPERVISOR_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const TERMINAL=new Set(["completed","failed","cleaned"]);
const STATES=new Set(["registered","running","completed","failed","recovering","cleaned"]);
function validateRecord(r,id,owner){
 if(!r||r.executionId!==id||r.ownerId!==owner||!STATES.has(r.state)||!Number.isSafeInteger(r.revision)||r.revision<1||!Number.isSafeInteger(r.fence)||r.fence<1)throw new Error("Invalid durable execution snapshot");
}
function validateObservation(o){
 if(!o||typeof o!=="object"||!["running","exited","absent","unknown"].includes(o.status)||typeof o.trusted!=="boolean")throw new Error("Invalid host observation");
}
export function createDurableRuntimeSupervisor({inspect,observeHost,readLease,clock=()=>Date.now()}={}){
 if(typeof inspect!=="function"||typeof observeHost!=="function"||typeof readLease!=="function"||typeof clock!=="function")throw new TypeError("Trusted supervisor dependencies required");
 return Object.freeze({
  async assess({executionId,ownerId}={}){
   if(typeof executionId!=="string"||!ID.test(executionId)||typeof ownerId!=="string"||!ID.test(ownerId))throw new TypeError("Invalid execution identity");
   const snapshot=await inspect({executionId,ownerId});
   const execution=snapshot?.execution;
   validateRecord(execution,executionId,ownerId);
   const audit=snapshot?.audit;
   if(!audit||audit.sequence!==execution.revision||audit.fence!==execution.fence||audit.to!==execution.state)throw new Error("Audit head mismatch");
   const now=clock();
   if(!Number.isSafeInteger(now)||now<0)throw new TypeError("Invalid supervisor clock");
   if(TERMINAL.has(execution.state))return Object.freeze({executionId,ownerId,revision:execution.revision,fence:execution.fence,classification:"terminal",action:"none"});
   const [observation,lease]=await Promise.all([observeHost({executionId,ownerId,fence:execution.fence}),readLease({executionId,ownerId})]);
   validateObservation(observation);
   if(!lease||typeof lease!=="object"||typeof lease.active!=="boolean"||!Number.isSafeInteger(lease.fence)||lease.fence<1||!Number.isSafeInteger(lease.expiresAt)||lease.expiresAt<0)throw new Error("Invalid durable lease");
   let classification="uncertain";
   if(observation.trusted===true&&lease.fence===execution.fence&&lease.active===true&&lease.expiresAt>now&&observation.status==="running"&&execution.state==="running")classification="observed-running";
   if(observation.trusted===true&&lease.fence===execution.fence&&lease.expiresAt<=now&&observation.status==="absent")classification="requires-reconciliation";
   return Object.freeze({executionId,ownerId,revision:execution.revision,fence:execution.fence,classification,action:classification==="requires-reconciliation"?"manual-review":"none"});
  }
 });
}
