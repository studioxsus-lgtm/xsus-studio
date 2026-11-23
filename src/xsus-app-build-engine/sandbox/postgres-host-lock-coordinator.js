export const POSTGRES_HOST_LOCK_COORDINATOR_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const LOCK_SQL="SELECT pg_advisory_lock(hashtextextended($1::text, 0))";
const UNLOCK_SQL="SELECT pg_advisory_unlock(hashtextextended($1::text, 0)) AS unlocked";
function validId(value){return typeof value==="string"&&ID.test(value);}
function validateClient(client){if(!client||typeof client.query!=="function"||typeof client.release!=="function")throw new TypeError("Dedicated PostgreSQL connection required");}
export function createPostgresHostLockCoordinator({connect}={}){
 if(typeof connect!=="function")throw new TypeError("Trusted PostgreSQL connection factory required");
 return Object.freeze({
  async withExclusiveExecutionLock(executionId,callback){
   if(!validId(executionId)||typeof callback!=="function")throw new TypeError("Invalid host lock request");
   const client=await connect();
   validateClient(client);
   const key="xsus-host:"+executionId;
   let locked=false,failed=null,result;
   try{
    await client.query(LOCK_SQL,[key]);locked=true;
    result=await callback();
   }catch(error){failed=error;}
   finally{
    if(locked){
     try{
      const response=await client.query(UNLOCK_SQL,[key]);
      if(!response||!Array.isArray(response.rows)||response.rows.length!==1||response.rows[0].unlocked!==true)throw new Error("PostgreSQL advisory unlock unverified");
     }catch(error){failed=failed?new AggregateError([failed,error],"Host action and advisory unlock failed"):error;}
    }
    try{await client.release(failed!==null);}catch(error){failed=failed?new AggregateError([failed,error],"Host lock and connection release failed"):error;}
   }
   if(failed)throw failed;
   return result;
  }
 });
}
