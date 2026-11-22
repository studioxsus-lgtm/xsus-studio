export const POSTGRES_EXECUTION_STORE_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const OWNER=/^[a-zA-Z0-9_-]{8,128}$/;
const STATES=new Set(["registered","running","completed","failed","recovering","cleaned"]);
function validate(record){
 if(!record||typeof record!=="object"||typeof record.executionId!=="string"||!ID.test(record.executionId)||typeof record.ownerId!=="string"||!OWNER.test(record.ownerId)||!STATES.has(record.state)||!Number.isSafeInteger(record.revision)||record.revision<1||!Number.isSafeInteger(record.fence)||record.fence<1||!Number.isSafeInteger(record.updatedAt)||record.updatedAt<0)throw new TypeError("Invalid execution record");
}
function parse(row){
 if(!row)return null;
 const record={executionId:row.execution_id,ownerId:row.owner_id,state:row.state,revision:Number(row.revision),fence:Number(row.fence),updatedAt:Number(row.updated_at_ms)};
 validate(record);
 return Object.freeze(record);
}
export function createPostgresExecutionStore({query}={}){
 if(typeof query!=="function")throw new TypeError("PostgreSQL query adapter required");
 const execute=async(sql,params)=>{const result=await query(sql,params);if(!result||!Array.isArray(result.rows))throw new TypeError("Invalid PostgreSQL response");return result.rows;};
 return Object.freeze({
  async createIfAbsent(executionId,record){
   validate(record);
   if(executionId!==record.executionId||record.revision!==1||record.fence!==1||record.state!=="registered")throw new TypeError("Invalid initial execution");
   const rows=await execute("INSERT INTO xsus_internal.build_executions (execution_id,owner_id,state,revision,fence,updated_at_ms) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (execution_id) DO NOTHING RETURNING execution_id",[record.executionId,record.ownerId,record.state,record.revision,record.fence,record.updatedAt]);
   return rows.length===1;
  },
  async read(executionId){
   if(typeof executionId!=="string"||!ID.test(executionId))throw new TypeError("Invalid execution ID");
   const rows=await execute("SELECT execution_id,owner_id,state,revision,fence,updated_at_ms FROM xsus_internal.build_executions WHERE execution_id=$1",[executionId]);
   if(rows.length>1)throw new Error("Duplicate execution records");
   return parse(rows[0]);
  },
  async compareAndSwap(executionId,revision,fence,next){
   validate(next);
   if(executionId!==next.executionId||!Number.isSafeInteger(revision)||revision<1||!Number.isSafeInteger(fence)||fence<1||next.revision!==revision+1||next.fence!==fence+1)throw new TypeError("Invalid execution CAS");
   const rows=await execute("UPDATE xsus_internal.build_executions SET state=$4,revision=$5,fence=$6,updated_at_ms=$7 WHERE execution_id=$1 AND owner_id=$2 AND revision=$3 AND fence=$8 RETURNING execution_id",[executionId,next.ownerId,revision,next.state,next.revision,next.fence,next.updatedAt,fence]);
   return rows.length===1;
  }
 });
}
