export const AUTHORITATIVE_LEASE_VERIFIER_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const SQL=`SELECT execution_id,holder_id,fence,expires_at_ms,
 (expires_at_ms > floor(extract(epoch from clock_timestamp()) * 1000)::bigint) AS unexpired
 FROM xsus_internal.build_execution_leases
 WHERE execution_id=$1 AND holder_id=$2 AND fence=$3`;
function safeFence(v){return Number.isSafeInteger(v)&&v>=1;}
function validId(v){return typeof v==="string"&&ID.test(v);}
function parseInt64(v){if(!["string","number"].includes(typeof v)||!/^(0|[1-9][0-9]*)$/.test(String(v)))throw new TypeError("Invalid PostgreSQL integer");const n=Number(v);if(!Number.isSafeInteger(n))throw new TypeError("Unsafe PostgreSQL integer");return n;}
export function createAuthoritativeLeaseVerifier({query}={}){
 if(typeof query!=="function")throw new TypeError("Trusted PostgreSQL query required");
 return Object.freeze({
  async verify({executionId,holderId,fence}={}){
   if(!validId(executionId)||!validId(holderId)||!safeFence(fence))throw new TypeError("Invalid lease verification request");
   const response=await query(SQL,[executionId,holderId,fence]);
   if(!response||!Array.isArray(response.rows)||response.rows.length>1)throw new TypeError("Invalid PostgreSQL response");
   if(response.rows.length===0)return Object.freeze({valid:false,reason:"missing-or-stale"});
   const row=response.rows[0];
   if(row.execution_id!==executionId||row.holder_id!==holderId||parseInt64(row.fence)!==fence)throw new Error("PostgreSQL lease identity mismatch");
   parseInt64(row.expires_at_ms);
   if(typeof row.unexpired!=="boolean")throw new TypeError("Invalid PostgreSQL expiry result");
   return Object.freeze({valid:row.unexpired,reason:row.unexpired?"active":"expired"});
  }
 });
}
