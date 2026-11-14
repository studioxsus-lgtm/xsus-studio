/**
 * XSUS App -> Hyper XSUS Core: server-only, read-only integration boundary.
 * No signing keys, filesystem paths, or privileged recovery actions in responses.
 */
import {createRecoveryAssurance} from "../../hyper-xsus-core/knowledge-reasoning/recovery-assurance-v80.js";

export const XSUS_HYPER_ADAPTER_VERSION="1.0.0";

export function createXsusHyperAdapter({verifyUser,inspectHealth,rounds=3}={}){
 if(typeof verifyUser!=="function"||typeof inspectHealth!=="function")
  throw new TypeError("Authenticated user verifier and trusted health inspector required.");
 const assurance=createRecoveryAssurance({inspectHealth,rounds});
 async function handle({authorization,method="GET"}={}){
  if(method!=="GET")return {status:405,data:{error:"Method not allowed."}};
  if(typeof authorization!=="string"||!/^Bearer\s+\S+$/i.test(authorization))
   return {status:401,data:{error:"Authentication required."}};
  try{
   const user=await verifyUser(authorization);
   if(!user||typeof user.userId!=="string"||!user.userId.trim())
    return {status:403,data:{error:"Access denied."}};
  }catch{
   return {status:403,data:{error:"Access denied."}};
  }
  try{
   const report=await assurance.assess();
   // Deliberately do not expose audit tips, checkpoint hashes, or filesystem metadata.
   return {status:200,data:Object.freeze({
    adapterVersion:XSUS_HYPER_ADAPTER_VERSION,
    coreVersion:report.version,
    status:report.status,
    safeToResume:report.safeToResume,
    consistent:report.consistent,
    rounds:report.rounds,
    completed:report.completed,
    blockers:Object.freeze([...report.blockers])
   })};
  }catch{
   return {status:503,data:{error:"Hyper XSUS Core verification unavailable."}};
  }
 }
 return Object.freeze({version:XSUS_HYPER_ADAPTER_VERSION,handle});
}
