export const BUILD_CONCURRENCY_LIMITER_VERSION="0.1.0";
/** Process-local, bounded FIFO admission. No distributed lock is implied. */
export function createBuildConcurrencyLimiter({maxActive=2,maxQueued=16}={}){
 if(!Number.isSafeInteger(maxActive)||maxActive<1||maxActive>64||!Number.isSafeInteger(maxQueued)||maxQueued<0||maxQueued>1024)throw new RangeError("Invalid concurrency limits");
 let active=0;const queue=[];
 function grantNext(){
  while(active<maxActive&&queue.length){
   const waiter=queue.shift();
   if(waiter.done)continue;
   waiter.done=true;waiter.signal?.removeEventListener?.("abort",waiter.abort);
   active++;waiter.resolve();
  }
 }
 async function acquire(signal){
  if(signal?.aborted)throw new Error("Build admission cancelled");
  // Preserve FIFO: a new arrival cannot overtake queued work.
  if(active<maxActive&&queue.length===0){active++;return;}
  if(queue.length>=maxQueued)throw new Error("Build admission queue full");
  await new Promise((resolve,reject)=>{
   const waiter={resolve,reject,signal,done:false,abort:null};
   waiter.abort=()=>{
    if(waiter.done)return;
    waiter.done=true;
    const index=queue.indexOf(waiter);
    if(index!==-1)queue.splice(index,1);
    signal?.removeEventListener?.("abort",waiter.abort);
    reject(new Error("Build admission cancelled"));
   };
   queue.push(waiter);
   signal?.addEventListener?.("abort",waiter.abort,{once:true});
   if(signal?.aborted)waiter.abort();
  });
 }
 return Object.freeze({
  async run(task,{signal}={}){
   if(typeof task!=="function")throw new TypeError("Build task must be a function");
   await acquire(signal);
   try{
    if(signal?.aborted)throw new Error("Build admission cancelled");
    return await task();
   }finally{active--;grantNext();}
  },
  snapshot(){return Object.freeze({active,queued:queue.length,maxActive,maxQueued});}
 });
}
