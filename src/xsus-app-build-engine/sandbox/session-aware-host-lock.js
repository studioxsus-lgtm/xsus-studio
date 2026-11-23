import {createPostgresSessionHealthMonitor} from "./postgres-session-health-monitor.js";
export const SESSION_AWARE_HOST_LOCK_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const LOCK="SELECT pg_advisory_lock(hashtextextended($1::text, 0))";
const UNLOCK="SELECT pg_advisory_unlock(hashtextextended($1::text, 0)) AS unlocked";
function pid(value){const n=Number(value);if(!Number.isSafeInteger(n)||n<=0||String(n)!==String(value))throw new TypeError("Invalid backend pid");return n;}
function responseRow(result){if(!result||!Array.isArray(result.rows)||result.rows.length!==1)throw new TypeError("Invalid PostgreSQL response");return result.rows[0];}
/**
 * Pinned PostgreSQL session coordinator. Health checks and callback are
 * serialized on the same connection. This is not continuous monitoring.
 */
export function createSessionAwareHostLock({connect}={}){
 if(typeof connect!=="function")throw new TypeError("Trusted PostgreSQL connection factory required");
 return Object.freeze({
  async withExclusiveExecutionLock(executionId,callback){
   if(typeof executionId!=="string"||!ID.test(executionId)||typeof callback!=="function")throw new TypeError("Invalid session lock request");
   const client=await connect();
   if(!client||typeof client.query!=="function"||typeof client.release!=="function")throw new TypeError("Dedicated PostgreSQL connection required");
   const key="xsus-host:"+executionId;
   let acquired=false,monitor=null,problem=null,value;
   const controller=new AbortController();
   try{
    const originalPid=pid(responseRow(await client.query("SELECT pg_backend_pid() AS pid")).pid);
    await client.query(LOCK,[key]);acquired=true;
    monitor=createPostgresSessionHealthMonitor({client,executionId,expectedPid:originalPid,onLost:()=>controller.abort()});
    if(await monitor.verify()!==true)throw new Error("PostgreSQL lock session unverified");
    value=await callback({signal:controller.signal});
    if(controller.signal.aborted||await monitor.verify()!==true)throw new Error("PostgreSQL lock session lost; outcome uncertain");
   }catch(error){problem=error;}
   finally{
    if(monitor){try{await monitor.close();}catch(error){problem=problem?new AggregateError([problem,error],"Session monitor cleanup failed"):error;}}
    if(acquired){
     try{
      const unlocked=responseRow(await client.query(UNLOCK,[key])).unlocked;
      if(unlocked!==true)throw new Error("PostgreSQL advisory unlock unverified");
     }catch(error){problem=problem?new AggregateError([problem,error],"Session lock cleanup failed"):error;}
    }
    try{await client.release(problem!==null);}catch(error){problem=problem?new AggregateError([problem,error],"PostgreSQL connection cleanup failed"):error;}
   }
   if(problem)throw problem;
   return value;
  }
 });
}
