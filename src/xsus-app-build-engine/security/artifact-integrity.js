import {validateBuildManifest} from "../build/build-manifest.js";
export const ARTIFACT_INTEGRITY_VERSION="0.1.0";
function canonical(manifest){
  return JSON.stringify({project:manifest.project,files:[...manifest.files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0).map(({path,content})=>({path,content}))});
}
export function createArtifactIntegrityRecord(input,{digest}={}){
  if(typeof digest!=="function")throw new TypeError("Trusted SHA-256 digest provider required");
  const manifest=validateBuildManifest(input);
  const value=digest(canonical(manifest));
  if(typeof value!=="string"||!/^[a-f0-9]{64}$/i.test(value))throw new TypeError("Expected SHA-256 hex digest");
  return Object.freeze({version:ARTIFACT_INTEGRITY_VERSION,algorithm:"sha256",digest:value.toLowerCase(),project:manifest.project,fileCount:manifest.files.length});
}
export function verifyArtifactIntegrity(input,record,{digest}={}){
  if(!record||record.algorithm!=="sha256"||typeof record.digest!=="string"||!/^[a-f0-9]{64}$/i.test(record.digest))throw new TypeError("Invalid integrity record");
  const actual=createArtifactIntegrityRecord(input,{digest});
  return actual.project===record.project&&actual.fileCount===record.fileCount&&actual.digest===record.digest.toLowerCase();
}
