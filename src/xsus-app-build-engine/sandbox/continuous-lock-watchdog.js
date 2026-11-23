export const CONTINUOUS_LOCK_WATCHDOG_VERSION="0.1.0";
/**
 * A cooperative, bounded watchdog. Uses an injected scheduler and monitor;
 * no claim of physical cancellation or uninterrupted lock ownership.
 */
export function createContinuousLockWatchdog({monitor,schedule,cancel,intervalMs=1000}={}){
 if(!monitor||typeof monitor.verify!=="function"||typeof schedule!=="function"||typeof cancel!=="function"||!Number.isSafeInteger(intervalMs)||intervalMs<100||intervalMs>30000)throw new TypeError("Invalid watchdog dependencies");
 return Object.freeze({
  async run(callback){
   if(typeof callback!=="function")throw new TypeError("Callback required");
   const controller=new AbortController();
   let timer=null,stopped=false,lost=false,inFlight=false;
   function markLost(){lost=true;controller.abort();}
   async function tick(){
    if(stopped||lost||inFlight)return;
    inFlight=true;
    try{if(await monitor.verify()!==true)markLost();}
    catch{markLost();}
    finally{
     inFlight=false;
     if(!stopped&&!lost)timer=schedule(tick,intervalMs);
    }
   }
   let result,error=null;
   try{
    if(await monitor.verify()!==true){markLost();throw new Error("Watchdog initial lock verification failed");}
    timer=schedule(tick,intervalMs);
    result=await callback({signal:controller.signal});
    if(lost||controller.signal.aborted)throw new Error("Watchdog lock lost; outcome uncertain");
    if(await monitor.verify()!==true){markLost();throw new Error("Watchdog final lock verification failed; outcome uncertain");}
   }catch(cause){error=cause;}
   finally{
    stopped=true;
    if(timer!==null)cancel(timer);
    // A pending probe may still complete after callback; never claim success
    // until it settles and its result has been observed.
    while(inFlight)await Promise.resolve();
    if(lost&&!error)error=new Error("Watchdog lock lost; outcome uncertain");
   }
   if(error)throw error;
   return result;
  }
 });
}
