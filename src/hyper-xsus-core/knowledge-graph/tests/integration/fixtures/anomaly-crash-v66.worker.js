/**
 * Child process fixture for v6.6 crash tests. Never used by production.
 * Modes: hold-lock, committed, hold-pre-rename.
 */
import {withExclusiveFileLock} from "../../../integration/exclusive-file-lock.js";
import {createPersistentAnomalyHistory} from "../../../integration/transaction-journal-health-anomaly-persistence.js";
import {writeAtomicJson} from "../../../integration/atomic-json-writer.js";
import {open} from "node:fs/promises";

const [mode,filePath]=process.argv.slice(2);
const healthy={status:"healthy",anomalyCount:0,anomalies:[]};
const wait=()=>new Promise(()=>{setInterval(()=>{},1000);});
try{
 if(mode==="hold-lock"){
  await withExclusiveFileLock(filePath,async()=>{
   process.send?.({stage:"locked"});
   await wait();
  });
 }else if(mode==="committed"){
  const store=createPersistentAnomalyHistory({filePath});
  await store.append(healthy,{timestamp:2});
  await store.close();
  process.send?.({stage:"committed"});
  await wait();
 }else if(mode==="hold-pre-rename"){
  await withExclusiveFileLock(filePath,async()=>{
   await writeAtomicJson(filePath,{version:"6.4.0",entries:[{timestamp:999,...healthy}]},{
    io:{open:async(path,flags,...rest)=>{
     const handle=await open(path,flags,...rest);
     if(flags==="wx"){
      const originalSync=handle.sync.bind(handle);
      handle.sync=async()=>{
       await originalSync();
       process.send?.({stage:"temp-synced"});
       await wait();
      };
     }
     return handle;
    }}
   });
  });
 }else throw new Error("Unknown fixture mode.");
}catch(error){
 process.send?.({stage:"error",message:String(error)});
 process.exitCode=1;
}
