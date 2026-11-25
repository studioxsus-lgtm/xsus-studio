export function createShutdown({stopAccepting,closeServer,stopMaintenance,diagnostics,forceClose,timeoutMs=30000,pollMs=25}={}){
 if([stopAccepting,closeServer,stopMaintenance,diagnostics,forceClose].some(f=>typeof f!=='function')||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||!Number.isSafeInteger(pollMs)||pollMs<1)throw TypeError('Invalid shutdown configuration');
 let task;
 return function shutdown(){
 if(task)return task;
 task=(async()=>{let timer,poll,expired=false;
 const drain=async()=>{await Promise.all([closeServer(),stopMaintenance()]);while(!expired){const d=diagnostics();if(d.active===0&&d.pending===0)return true;await new Promise(r=>{poll=setTimeout(r,pollMs)})}return false};
 try{stopAccepting();const deadline=new Promise(resolve=>{timer=setTimeout(()=>{expired=true;resolve(false)},timeoutMs)});const graceful=await Promise.race([drain(),deadline]);if(!graceful)forceClose();return {graceful}}
 catch{forceClose();return {graceful:false}}
 finally{expired=true;clearTimeout(timer);clearTimeout(poll)}
 })();return task;
 };
}
