import {createHash} from "node:crypto";
import {createAtomicExecutionRegistration} from "./atomic-execution-registration.js";
import {createPostgresTransactionProvider} from "./postgres-transaction-provider.js";
import {createTransactionalExecutionAudit} from "./transactional-execution-audit.js";
export const EXECUTION_LIFECYCLE_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
export function createExecutionLifecycle({connect,clock=()=>Date.now()}={}){
 if(typeof connect!=="function"||typeof clock!=="function")throw new TypeError("Trusted lifecycle dependencies required");
 const registration=createAtomicExecutionRegistration({connect,clock});
 const transaction=createPostgresTransactionProvider({connect});
 const transitions=createTransactionalExecutionAudit({transaction,clock,digest:async value=>createHash("sha256").update(value).digest("hex")});
 const change=async(executionId,ownerId,current,to)=>{
  if(!current||current.executionId!==executionId||current.ownerId!==ownerId)throw new Error("Execution ownership mismatch");
  return transitions.transition({executionId,ownerId,expectedRevision:current.revision,expectedFence:current.fence,to});
 };
 return Object.freeze({
  register:args=>registration.register(args),
  start:(executionId,ownerId,current)=>change(executionId,ownerId,current,"running"),
  complete:(executionId,ownerId,current)=>change(executionId,ownerId,current,"completed"),
  fail:(executionId,ownerId,current)=>change(executionId,ownerId,current,"failed"),
  authorizeRecovery:(executionId,ownerId,current)=>change(executionId,ownerId,current,"recovering"),
  markCleaned:(executionId,ownerId,current)=>change(executionId,ownerId,current,"cleaned"),
  async inspect(executionId,ownerId){
   if(typeof executionId!=="string"||!ID.test(executionId)||typeof ownerId!=="string"||!ID.test(ownerId))throw new TypeError("Invalid execution identity");
   return transaction(async tx=>{
    const execution=await tx.lockExecution(executionId);
    if(!execution||execution.ownerId!==ownerId)throw new Error("Execution unavailable");
    const audit=await tx.readAuditHead(executionId);
    if(!audit||audit.sequence!==execution.revision||audit.fence!==execution.fence||audit.to!==execution.state)throw new Error("Execution audit mismatch");
    return Object.freeze({execution,audit});
   });
  }
 });
}
