export const POSTGRES_LEASE_STORE_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
function validId(v){return typeof v==="string"&&ID.test(v);}
function safeInt(v){if(typeof v!=="string"&&typeof v!=="number")throw new TypeError("Invalid PostgreSQL integer");const n=Number(v);if(!Number.isSafeInteger(n)||n<0||String(n)!==String(v))throw new TypeError("Unsafe PostgreSQL integer");return n;}
function lease(row){if(!row)return null;const r=Object.freeze({executionId:row.execution_id,holderId:row.holder_id,fence:safeInt(row.fence),expiresAt:safeInt(row.expires_at_ms)});if(!validId(r.executionId)||!validId(r.holderId)||r.fence<1)throw new TypeError("Invalid PostgreSQL lease row");return r;}
function validRecord(r,id){return r&&r.executionId===id&&validId(id)&&validId(r.holderId)&&Number.isSafeInteger(r.fence)&&r.fence>=1&&Number.isSafeInteger(r.expiresAt)&&r.expiresAt>=0;}
export function createPostgresLeaseStore({query}={}){
 if(typeof query!=="function")throw new TypeError("Trusted PostgreSQL query required");
 async function rows(sql,params){const response=await query(sql,params);if(!response||!Array.isArray(response.rows))throw new TypeError("Invalid PostgreSQL response");return response.rows;}
 return Object.freeze({
  async read(executionId){
   if(!validId(executionId))throw new TypeError("Invalid execution ID");
   const result=await rows("SELECT execution_id,holder_id,fence,expires_at_ms FROM xsus_internal.build_execution_leases WHERE execution_id=$1",[executionId]);
   if(result.length>1)throw new Error("Duplicate lease rows");
   return lease(result[0]);
  },
  async createIfAbsent(executionId,next){
   if(!validRecord(next,executionId)||next.fence!==1)throw new TypeError("Invalid initial lease");
   const result=await rows("INSERT INTO xsus_internal.build_execution_leases (execution_id,holder_id,fence,expires_at_ms) VALUES ($1,$2,$3,$4) ON CONFLICT (execution_id) DO NOTHING RETURNING execution_id",[executionId,next.holderId,next.fence,next.expiresAt]);
   if(result.length>1)throw new Error("Duplicate lease insert");
   return result.length===1&&result[0].execution_id===executionId;
  },
  async compareAndSwap(executionId,current,next){
   if(!validRecord(current,executionId)||!validRecord(next,executionId))throw new TypeError("Invalid lease CAS");
   const takeover=next.fence===current.fence+1;
   const renewal=next.fence===current.fence&&next.holderId===current.holderId&&next.expiresAt>=current.expiresAt;
   const release=next.fence===current.fence&&next.holderId===current.holderId&&next.expiresAt===0;
   if(!takeover&&!renewal&&!release)throw new TypeError("Invalid fencing transition");
   // Compare all previous fields to prevent ABA, stale renewals and stale releases.
   const result=await rows("UPDATE xsus_internal.build_execution_leases SET holder_id=$5,fence=$6,expires_at_ms=$7 WHERE execution_id=$1 AND holder_id=$2 AND fence=$3 AND expires_at_ms=$4 RETURNING execution_id",[executionId,current.holderId,current.fence,current.expiresAt,next.holderId,next.fence,next.expiresAt]);
   if(result.length>1)throw new Error("Duplicate lease update");
   return result.length===1&&result[0].execution_id===executionId;
  }
 });
}
