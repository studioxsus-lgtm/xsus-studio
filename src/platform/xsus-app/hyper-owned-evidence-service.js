/**
 * Internal evidence creation pipeline: verified principal -> signed runtime
 * observation -> atomic evidence+owner RPC. Never exposed as a public route.
 */
import {createHyperEvidenceProvenance} from "./hyper-v8222-evidence-provenance.js";
import {prepareHyperRuntimeEvidenceRow} from "./hyper-v8216-runtime-evidence-schema.js";
import {createHyperOwnedEvidenceWriter} from "./hyper-owned-evidence-writer.js";
export function createHyperOwnedEvidenceService({
  url,serviceRoleKey,key,keyId,fetchImpl,enabled=false
}={}){
  const provenance=createHyperEvidenceProvenance({key,keyId});
  const writer=createHyperOwnedEvidenceWriter({
    url,serviceRoleKey,fetchImpl,enabled
  });
  return Object.freeze({
    productionEligible:false,
    async create({input,verifiedPrincipal}={}){
      if(enabled!==true)return Object.freeze({stored:false,reason:"SERVICE_DISABLED"});
      if(verifiedPrincipal?.verified!==true ||
         verifiedPrincipal?.source!=="server-verified-principal")
        return Object.freeze({stored:false,reason:"UNVERIFIED_PRINCIPAL"});
      let row,envelope;
      try{
        row=prepareHyperRuntimeEvidenceRow(input);
        envelope=provenance.sign(input);
      }catch{return Object.freeze({stored:false,reason:"INVALID_EVIDENCE"});}
      return writer.storeOwned({bundle:{row,envelope},verifiedPrincipal});
    }
  });
}
