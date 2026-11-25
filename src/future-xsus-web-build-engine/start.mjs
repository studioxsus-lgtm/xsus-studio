import {createPersistentProduction} from './production.mjs';
const runtime=await createPersistentProduction({env:process.env});
runtime.server.listen(runtime.port,'0.0.0.0',()=>{runtime.startMaintenance();console.log('XSUS Web Build Engine listening')});
let stopping=false;
function stop(){if(stopping)return;stopping=true;runtime.stopAccepting();void runtime.stopMaintenance();runtime.server.close(async()=>{await runtime.stopMaintenance();process.exitCode=0});runtime.server.closeIdleConnections();const timer=setTimeout(()=>{runtime.server.closeAllConnections();process.exit(1)},30000);timer.unref()}
process.once('SIGTERM',stop);process.once('SIGINT',stop);
