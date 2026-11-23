export const POSTGRES_TIME_LEASE_MANAGER_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const MAX_DURATION=300000;
const NOW="floor(extract(epoch from clock_timestamp()) * 1000)::bigint";
function validId(v){return typeof v==="string"&&ID.test(v);}
function validDuration(v){return Number.isSafeInteger(v)&&v>0&&v<=MAX_DURATION;}
function validFence(v){return Number.isSafeInteger(v)&&v>=1;}
function parseInteger(v){if((typeof v!=="number"&&typeof v!=="string")||!/^(0|[1-9][0-9]*)$/.test(String(v)))throw new TypeError("Invalid PostgreSQL integer");const n=Number(v);if(!Number.isSafeInteger(n))throw new TypeError("Unsafe PostgreSQL integer");return n;}
function parseRow(row,id){if(!row||row.execution_id!==id||!validId(row.holder_id))throw new TypeError("Invalid PostgreSQL lease row");const fence=parseInteger(row.fence),expiresAt=parseInteger(row.expires_at_ms);if(fence<1)throw new TypeError("Invalid lease fence");return Object.freeze({executionId:id,holderId:row.holder_id,fence,expiresAt});}
export function createPostgresTimeLeaseManager({query}={}){
 if(typeof query!=="function")throw new TypeError("Trusted PostgreSQL query required");
 async function one(sql,params,id){const response=await query(sql,params);if(!response||!Array.isArray(response.rows)||response.rows.length>1)throw new TypeError("Invalid PostgreSQL response");return response.rows.length?parseRow(response.rows[0],id):null;}
 return Object.freeze({
  async acquire({executionId,holderId,durationMs}={}){
   if(!validId(executionId)||!validId(holderId)||!validDuration(durationMs))throw new TypeError("Invalid lease acquisition");
   // Single-statement UPSERT serializes competing acquisitions on the primary key.
   // A new owner is admitted only when the previous lease has expired by DB time.
   const sql=`INSERT INTO xsus_internal.build_execution_leases AS l (execution_id,holder_id,fence,expires_at_ms)
    VALUES ($1,$2,1,(${NOW} + $3::bigint))
    ON CONFLICT (execution_id) DO UPDATE SET
      holder_id=EXCLUDED.holder_id,
      fence=l.fence+1,
      expires_at_ms=(${NOW} + $3::bigint)
    WHERE l.expires_at_ms <= ${NOW} AND l.fence < 9223372036854775807
    RETURNING execution_id,holder_id,fence,expires_at_ms`;
   const row=await one(sql,[executionId,holderId,durationMs],executionId);
   if(!row)throw new Error("Lease already held");
   return row;
  },
  async renew({executionId,holderId,fence,durationMs}={}){
   if(!validId(executionId)||!validId(holderId)||!validFence(fence)||!validDuration(durationMs))throw new TypeError("Invalid lease renewal");
   const sql=`UPDATE xsus_internal.build_execution_leases AS l
    SET expires_at_ms=GREATEST(l.expires_at_ms,(${NOW} + $4::bigint))
    WHERE l.execution_id=$1 AND l.holder_id=$2 AND l.fence=$3
      AND l.expires_at_ms > ${NOW}
    RETURNING execution_id,holder_id,fence,expires_at_ms`;
   const row=await one(sql,[executionId,holderId,fence,durationMs],executionId);
   if(!row)throw new Error("Lease expired or ownership lost");
   if(row.fence!==fence||row.holderId!==holderId)throw new Error("Lease renewal identity mismatch");
   return row;
  },
  async release({executionId,holderId,fence}={}){
   if(!validId(executionId)||!validId(holderId)||!validFence(fence))throw new TypeError("Invalid lease release");
   const sql="UPDATE xsus_internal.build_execution_leases SET expires_at_ms=0 WHERE execution_id=$1 AND holder_id=$2 AND fence=$3 RETURNING execution_id,holder_id,fence,expires_at_ms";
   const row=await one(sql,[executionId,holderId,fence],executionId);
   if(!row)throw new Error("Lease ownership lost");
   if(row.holderId!==holderId||row.fence!==fence||row.expiresAt!==0)throw new Error("Lease release mismatch");
   return true;
  }
 });
}
