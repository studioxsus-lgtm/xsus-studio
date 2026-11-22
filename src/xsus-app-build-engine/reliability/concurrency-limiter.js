export const CONCURRENCY_LIMITER_VERSION="0.1.0";
export function createConcurrencyLimiter({maxConcurrent=4,maxQueued=100}={}){
  if(!Number.isSafeInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>100)throw new RangeError("Invalid concurrency limit");
  if(!Number.isSafeInteger(maxQueued)||maxQueued<0||maxQueued>10000)throw new RangeError("Invalid queue limit");
  let active=0;
  const pending=[];
  function pump(){
    while(active<maxConcurrent&&pending.length){
      const task=pending.shift();
      if(task.signal?.aborted){task.reject(new Error("Task cancelled"));continue;}
      active++;
      Promise.resolve().then(()=>task.operation({signal:task.signal})).then(task.resolve,task.reject).finally(()=>{active--;pump();});
    }
  }
  return Object.freeze({
    run(operation,{signal}={}){
      if(typeof operation!=="function")return Promise.reject(new TypeError("Operation required"));
      if(signal?.aborted)return Promise.reject(new Error("Task cancelled"));
      if(pending.length>=maxQueued&&active>=maxConcurrent)return Promise.reject(new Error("Queue capacity exceeded"));
      return new Promise((resolve,reject)=>{
        const task={operation,resolve,reject,signal};
        if(signal&&typeof signal.addEventListener==="function"){
          signal.addEventListener("abort",()=>{
            const index=pending.indexOf(task);
            if(index!==-1){pending.splice(index,1);reject(new Error("Task cancelled"));}
          },{once:true});
        }
        pending.push(task);
        pump();
      });
    },
    snapshot(){return Object.freeze({active,queued:pending.length,maxConcurrent,maxQueued});}
  });
}
