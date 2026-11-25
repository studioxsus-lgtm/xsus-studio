export function createMaintenance({work,intervalMs=3600000,clock=Date.now}={}){
 if(typeof work!=='function'||!Number.isSafeInteger(intervalMs)||intervalMs<1000||intervalMs>86400000||typeof clock!=='function')throw TypeError('Invalid maintenance configuration');
 let timer=null,active=null,stopped=false,runs=0,failures=0,lastFinished=null;
 function run(){if(stopped)return Promise.resolve(false);if(active)return active;
 active=Promise.resolve().then(work).then(()=>true,()=>{failures++;return false}).finally(()=>{runs++;lastFinished=clock();active=null});return active}
 return Object.freeze({run,start(){if(stopped)throw Error('Maintenance stopped');if(timer)return;timer=setInterval(()=>{void run()},intervalMs);timer.unref?.()},async stop(){stopped=true;if(timer)clearInterval(timer);timer=null;await active},diagnostics:()=>({running:!!active,scheduled:!!timer,runs,failures,lastFinished})});
}
