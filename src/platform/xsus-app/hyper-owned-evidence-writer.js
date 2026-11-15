/**
 * Trusted server-only atomic evidence+owner writer.
 * No public HTTP endpoint. Caller must derive userId from verified auth.
 */
import { prepareHyperAtomicBundle } from "./hyper-v8224-atomic-bundle-contract.js";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createHyperOwnedEvidenceWriter({
  url,serviceRoleKey,fetchImpl=globalThis.fetch,enabled=false
}={}){
  let parsed;
  try{parsed=new URL(url);}catch{throw new TypeError("Invalid evidence writer configuration");}
  if(parsed.protocol!=="https:"||!/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname)||
     parsed.pathname!=="/"||parsed.port||parsed.search||parsed.hash||
     parsed.username||parsed.password||typeof serviceRoleKey!=="string"||
     !serviceRoleKey.trim()||typeof fetchImpl!=="function")
    throw new TypeError("Invalid evidence writer configuration");
  return Object.freeze({
    productionEligible:false,
    async storeOwned({bundle,verifiedPrincipal}={}){
      if(enabled!==true)return Object.freeze({stored:false,reason:"WRITER_DISABLED"});
      // A server-verified principal must be supplied by a trusted internal
      // handler. Never pass userId directly from client input.
      if(verifiedPrincipal?.verified!==true||
         verifiedPrincipal?.source!=="server-verified-principal"||
         typeof verifiedPrincipal.userId!=="string"||
         !UUID.test(verifiedPrincipal.userId))
        return Object.freeze({stored:false,reason:"UNVERIFIED_PRINCIPAL"});
      let row;
      try{row=prepareHyperAtomicBundle(bundle);}
      catch{return Object.freeze({stored:false,reason:"INVALID_BUNDLE"});}
      try{
        const response=await fetchImpl(parsed.origin+
          "/rest/v1/rpc/hyper_insert_owned_evidence",{
          method:"POST",redirect:"error",signal:AbortSignal.timeout(10000),
          headers:{apikey:serviceRoleKey,Authorization:"Bearer "+serviceRoleKey,
            "Content-Type":"application/json",Accept:"application/json"},
          body:JSON.stringify({p_bundle:row,p_user_id:verifiedPrincipal.userId})
        });
        if(!response?.ok)throw Error("RPC failed");
        const id=await response.json();
        if(id!==row.observation_id)throw Error("RPC response mismatch");
        return Object.freeze({stored:true,observationId:id});
      }catch{return Object.freeze({stored:false,reason:"ATOMIC_PROVISIONING_FAILED"});}
    }
  });
}
