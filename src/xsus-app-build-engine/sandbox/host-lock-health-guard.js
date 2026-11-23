export const HOST_LOCK_HEALTH_GUARD_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const validId=x=>typeof x==="string"&&ID.test(x);
/**
 * A guard around a lock coordinator. The lock implementation must expose a
 * trusted monitor that detects loss of its own pinned database session.
 * Monitoring is an injected contract, not proof of physical host fencing.
 */
export function createHostLockHealthGuard({withExclusiveExecutionLock,createMonitor}={}){
 if(typeof withExclusiveExecutionLock!=="function"||typeof createMonitor!=="function")throw new TypeError("Trusted host lock health dependencies required");
 return Object.freeze({
  async withGuardedLock(executionId,callback){
   if(!validId(executionId)||typeof callback!=="function")throw new TypeError("Invalid guarded lock request");
   return withExclusiveExecutionLock(executionId,async()=>{
    const controller=new AbortController();
    const monitor=await createMonitor({executionId,onLost:()=>controller.abort()});
    if(!monitor||typeof monitor.verify!=="function"||typeof monitor.close!=="function")throw new TypeError("Invalid lock health monitor");
    let result,problem=null;
    try{
     if(await monitor.verify()!==true||controller.signal.aborted)throw new Error("Host lock health unverified");
     result=await callback({signal:controller.signal});
     if(controller.signal.aborted||await monitor.verify()!==true)throw new Error("Host lock health lost; outcome uncertain");
    }catch(error){problem=error;}
    finally{
     try{await monitor.close();}catch(error){problem=problem?new AggregateError([problem,error],"Lock health and monitor cleanup failed"):error;}
    }
    if(problem)throw problem;
    return result;
   });
  }
 });
}
