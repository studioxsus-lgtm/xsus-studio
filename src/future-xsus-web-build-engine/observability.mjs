export function createObservability({clock=()=>performance.now()}={}){
 if(typeof clock!=='function')throw TypeError('Invalid clock');
 let active=0,total=0,aborted=0,duration=0,maxDuration=0;
 const statuses={success:0,redirect:0,clientError:0,serverError:0,other:0};
 return Object.freeze({
 begin(){const start=clock();active++;let done=false;return (status)=>{if(done)return;done=true;active--;total++;const elapsed=Math.max(0,clock()-start);if(Number.isFinite(elapsed)){duration+=elapsed;maxDuration=Math.max(maxDuration,elapsed)}if(status===null){aborted++;return}const key=status>=200&&status<300?'success':status>=300&&status<400?'redirect':status>=400&&status<500?'clientError':status>=500&&status<600?'serverError':'other';statuses[key]++}},
 snapshot(){return {active,total,aborted,statuses:{...statuses},averageMs:total?duration/total:0,maxDurationMs:maxDuration}}
 });
}
