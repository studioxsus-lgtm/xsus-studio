export const OPERATION_METRICS_VERSION="0.1.0";
export function createOperationMetrics({clock=()=>Date.now(),maxSamples=1000}={}){
  if(typeof clock!=="function")throw new TypeError("Clock required");
  if(!Number.isSafeInteger(maxSamples)||maxSamples<1||maxSamples>100000)throw new RangeError("Invalid sample limit");
  const samples=[];
  return Object.freeze({
    async measure(name,operation){
      if(typeof name!=="string"||!/^[a-z][a-z0-9_.-]{0,63}$/.test(name))throw new TypeError("Invalid operation name");
      if(typeof operation!=="function")throw new TypeError("Operation required");
      const start=clock();
      let success=false;
      try{const value=await operation();success=true;return value;}
      finally{
        const elapsed=clock()-start;
        samples.push(Object.freeze({name,success,durationMs:Number.isFinite(elapsed)?Math.max(0,elapsed):0}));
        if(samples.length>maxSamples)samples.shift();
      }
    },
    summary(name){
      const selected=samples.filter(s=>name===undefined||s.name===name);
      const durations=selected.map(s=>s.durationMs).sort((a,b)=>a-b);
      const count=selected.length;
      return Object.freeze({count,successes:selected.filter(s=>s.success).length,failures:selected.filter(s=>!s.success).length,averageMs:count?selected.reduce((sum,s)=>sum+s.durationMs,0)/count:0,p95Ms:count?durations[Math.ceil(count*.95)-1]:0});
    }
  });
}
