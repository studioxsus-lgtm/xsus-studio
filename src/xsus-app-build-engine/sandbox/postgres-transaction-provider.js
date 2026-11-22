export const POSTGRES_TRANSACTION_PROVIDER_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const HEX=/^[a-f0-9]{64}$/;
function safeInt(v){const n=Number(v);if(!Number.isSafeInteger(n)||n<0)throw new TypeError("Unsafe PostgreSQL integer");return n;}
function record(row){if(!row)return null;return Object.freeze({executionId:row.execution_id,ownerId:row.owner_id,state:row.state,revision:safeInt(row.revision),fence:safeInt(row.fence),updatedAt:safeInt(row.updated_at_ms)});}
function head(row){if(!row)return null;return Object.freeze({sequence:safeInt(row.sequence),fence:safeInt(row.fence),to:row.to_state,hash:row.hash});}
export function createPostgresTransactionProvider({connect}={}){
 if(typeof connect!=="function")throw new TypeError("Dedicated PostgreSQL connection provider required");
 return async function transaction(work){
  if(typeof work!=="function")throw new TypeError("Transaction callback required");
  const client=await connect();
  if(!client||typeof client.query!=="function"||typeof client.release!=="function")throw new TypeError("Invalid PostgreSQL client");
  let begun=false;
  const query=async(sql,params=[])=>{const r=await client.query(sql,params);if(!r||!Array.isArray(r.rows))throw new TypeError("Invalid PostgreSQL response");return r.rows;};
  try{
   await query("BEGIN");begun=true;
   const tx=Object.freeze({
    async lockExecution(executionId){
     if(typeof executionId!=="string"||!ID.test(executionId))throw new TypeError("Invalid execution ID");
     const rows=await query("SELECT execution_id,owner_id,state,revision,fence,updated_at_ms FROM xsus_internal.build_executions WHERE execution_id=$1 FOR UPDATE",[executionId]);
     if(rows.length>1)throw new Error("Duplicate execution records");
     return record(rows[0]);
    },
    async readAuditHead(executionId){
     if(typeof executionId!=="string"||!ID.test(executionId))throw new TypeError("Invalid execution ID");
     const rows=await query("SELECT sequence,fence,to_state,hash FROM xsus_internal.build_execution_audit WHERE execution_id=$1 ORDER BY sequence DESC LIMIT 1",[executionId]);
     if(rows.length>1)throw new Error("Duplicate audit head");
     return head(rows[0]);
    },
    async updateExecution(current,next){
     if(!current||!next||current.executionId!==next.executionId||current.ownerId!==next.ownerId||!ID.test(current.executionId)||!ID.test(current.ownerId)||next.revision!==current.revision+1||next.fence!==current.fence+1)throw new TypeError("Invalid execution update");
     const rows=await query("UPDATE xsus_internal.build_executions SET state=$4,revision=$5,fence=$6,updated_at_ms=$7 WHERE execution_id=$1 AND owner_id=$2 AND revision=$3 AND fence=$8 RETURNING execution_id",[current.executionId,current.ownerId,current.revision,next.state,next.revision,next.fence,next.updatedAt,current.fence]);
     return rows.length===1;
    },
    async appendAudit(event,expectedHash){
     if(!event||!ID.test(event.executionId)||!HEX.test(expectedHash)||event.previousHash!==expectedHash||!HEX.test(event.hash)||!Number.isSafeInteger(event.sequence)||event.sequence<2||event.revision!==event.sequence||event.fence!==event.sequence)throw new TypeError("Invalid audit append");
     const rows=await query("INSERT INTO xsus_internal.build_execution_audit (execution_id,sequence,revision,fence,from_state,to_state,timestamp_ms,previous_hash,hash,version) SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10 WHERE EXISTS (SELECT 1 FROM xsus_internal.build_execution_audit WHERE execution_id=$1 AND sequence=$11 AND hash=$8) ON CONFLICT DO NOTHING RETURNING sequence",[event.executionId,event.sequence,event.revision,event.fence,event.from,event.to,event.timestamp,event.previousHash,event.hash,event.version,event.sequence-1]);
     return rows.length===1;
    }
   });
   const result=await work(tx);
   await query("COMMIT");begun=false;
   return result;
  }catch(error){
   if(begun){try{await query("ROLLBACK");}catch(rollbackError){throw new AggregateError([error,rollbackError],"Transaction and rollback failed");}}
   throw error;
  }finally{client.release();}
 };
}
