import {createHash} from "node:crypto";
export const ATOMIC_EXECUTION_REGISTRATION_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const ZERO="0".repeat(64);
export function createAtomicExecutionRegistration({connect,clock=()=>Date.now()}={}){
 if(typeof connect!=="function"||typeof clock!=="function")throw new TypeError("Trusted database connection and clock required");
 return Object.freeze({
  async register({executionId,ownerId}={}){
   if(typeof executionId!=="string"||!ID.test(executionId)||typeof ownerId!=="string"||!ID.test(ownerId))throw new TypeError("Invalid execution identity");
   const timestamp=clock();
   if(!Number.isSafeInteger(timestamp)||timestamp<0)throw new TypeError("Invalid timestamp");
   const execution=Object.freeze({executionId,ownerId,state:"registered",revision:1,fence:1,updatedAt:timestamp});
   const event={version:"0.1.0",executionId,sequence:1,revision:1,fence:1,from:null,to:"registered",timestamp,previousHash:ZERO};
   const hash=createHash("sha256").update(JSON.stringify([event.version,event.executionId,event.sequence,event.revision,event.fence,event.from,event.to,event.timestamp,event.previousHash])).digest("hex");
   const audit=Object.freeze({...event,hash});
   const client=await connect();
   if(!client||typeof client.query!=="function"||typeof client.release!=="function")throw new TypeError("Invalid PostgreSQL client");
   let begun=false;
   async function query(sql,params=[]){const response=await client.query(sql,params);if(!response||!Array.isArray(response.rows))throw new TypeError("Invalid PostgreSQL response");return response.rows;}
   try{
    await query("BEGIN");begun=true;
    const inserted=await query("INSERT INTO xsus_internal.build_executions (execution_id,owner_id,state,revision,fence,updated_at_ms) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (execution_id) DO NOTHING RETURNING execution_id",[executionId,ownerId,"registered",1,1,timestamp]);
    if(inserted.length!==1)throw new Error("Execution already registered");
    const audited=await query("INSERT INTO xsus_internal.build_execution_audit (execution_id,sequence,revision,fence,from_state,to_state,timestamp_ms,previous_hash,hash,version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING sequence",[executionId,1,1,1,null,"registered",timestamp,ZERO,hash,event.version]);
    if(audited.length!==1||Number(audited[0].sequence)!==1)throw new Error("Initial audit insertion failed");
    await query("COMMIT");begun=false;
    return Object.freeze({execution,audit});
   }catch(error){
    if(begun){try{await query("ROLLBACK");}catch(rollbackError){throw new AggregateError([error,rollbackError],"Registration and rollback failed");}}
    throw error;
   }finally{client.release();}
  }
 });
}
