import {createSandboxPolicy} from "../sandbox/sandbox-policy.js";
import {validateBuildManifest} from "../build/build-manifest.js";
export const BUILD_SECURITY_GATE_VERSION="0.1.0";
const MAX_TOTAL_BYTES=2*1024*1024;
const FORBIDDEN=new Set([".env",".env.local",".env.production","id_rsa","id_ed25519","credentials.json","service-account.json","docker.sock"]);
const EXECUTABLE=/\.(?:sh|bash|exe|dll|so|dylib|ps1|bat|cmd)$/i;
export function enforceBuildSecurity({manifest,policy}={}){
 const artifact=validateBuildManifest(manifest);
 const normalizedPolicy=createSandboxPolicy(policy??{});
 let totalBytes=0;
 for(const file of artifact.files){
  const parts=file.path.toLowerCase().split("/");
  if(parts.some(part=>FORBIDDEN.has(part))||EXECUTABLE.test(file.path))throw new TypeError("Prohibited build artifact path");
  totalBytes+=new TextEncoder().encode(file.content).byteLength;
  if(totalBytes>MAX_TOTAL_BYTES)throw new RangeError("Build exceeds aggregate source limit");
 }
 return Object.freeze({manifest:artifact,policy:normalizedPolicy,totalBytes});
}
