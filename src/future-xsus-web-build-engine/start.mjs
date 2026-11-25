import {createPersistentProduction} from './production.mjs';
import {createShutdown} from './shutdown.mjs';
const runtime=await createPersistentProduction({env:process.env});
runtime.server.listen(runtime.port,'0.0.0.0',()=>{runtime.startMaintenance();console.log('XSUS Web Build Engine listening')});
const shutdown=createShutdown({stopAccepting:runtime.stopAccepting,closeServer:()=>new Promise((resolve,reject)=>{runtime.server.close(e=>e?reject(e):resolve());runtime.server.closeIdleConnections()}),stopMaintenance:runtime.stopMaintenance,diagnostics:runtime.diagnostics,forceClose:()=>runtime.server.closeAllConnections()});
async function stop(){const {graceful}=await shutdown();if(!graceful)process.exit(1);process.exitCode=0}
process.once('SIGTERM',stop);process.once('SIGINT',stop);
