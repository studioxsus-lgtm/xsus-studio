export const POSTGRES_SESSION_HEALTH_MONITOR_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const SQL="SELECT pg_backend_pid() AS pid, pg_try_advisory_lock(hashtextextended($1::text, 0)) AS acquired";
function validId(v){return typeof v==="string"&&ID.test(v);}
function parsePid(v){const n=Number(v);if(!Number.isSafeInteger(n)||n<=0||String(n)!==String(v))throw new TypeError("Invalid PostgreSQL backend pid");return n;}
/**
 * Requires a dedicated, pinned PostgreSQL client which ALREADY holds the
 * advisory lock. Reentrant pg_try_advisory_lock must be balanced with unlock.
 * Never call concurrently with other queries on the same connection.
 */
export function createPostgresSessionHealthMonitor({client,executionId,expectedPid,onLost}={}){
 if(!client||typeof client.query!=="function"||!validId(executionId)||!Number.isSafeInteger(expectedPid)||expectedPid<=0||typeof onLost!=="function")throw new TypeError("Invalid pinned session monitor dependencies");
 let closed=false,lost=false;
 const key="xsus-host:"+executionId;
 function markLost(){if(!lost){lost=true;onLost();}}
 return Object.freeze({
  async verify(){
   if(closed||lost)return false;
   try{
    const response=await client.query(SQL,[key]);
    if(!response||!Array.isArray(response.rows)||response.rows.length!==1)throw new Error("Invalid session health response");
    const row=response.rows[0];
    const pid=parsePid(row.pid);
    // pg_try_advisory_lock is reentrant on the owning session; if true,
    // immediately release ONLY the additional acquisition.
    if(row.acquired===true){
     const unlock=await client.query("SELECT pg_advisory_unlock(hashtextextended($1::text, 0)) AS unlocked",[key]);
     if(!unlock||!Array.isArray(unlock.rows)||unlock.rows.length!==1||unlock.rows[0].unlocked!==true)throw new Error("Session health probe unlock unverified");
    }
    if(row.acquired!==true||pid!==expectedPid){markLost();return false;}
    return true;
   }catch(error){markLost();return false;}
  },
  async close(){closed=true;},
  get lost(){return lost;}
 });
}
