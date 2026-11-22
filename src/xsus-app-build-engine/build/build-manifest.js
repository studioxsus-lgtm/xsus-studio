export const BUILD_MANIFEST_VERSION="0.1.0";
const PATH=/^[a-zA-Z0-9_./-]+$/;
const MAX_FILES=200;
const MAX_FILE_BYTES=500000;
export function validateBuildManifest({project,files}={}) {
  if(typeof project!=="string" || !/^[a-z][a-z0-9-]{1,47}$/.test(project)) throw new TypeError("Invalid project slug");
  if(!Array.isArray(files)||files.length<1||files.length>MAX_FILES) throw new TypeError("Invalid build file count");
  const paths=new Set();
  const normalized=files.map(file=>{
    if(!file || typeof file!=="object" || typeof file.path!=="string" || !PATH.test(file.path) || file.path.startsWith("/") || file.path.split("/").some(segment=>segment==="."||segment===".."||!segment)) throw new TypeError("Unsafe build file path");
    if(paths.has(file.path)) throw new TypeError("Duplicate build file path");
    paths.add(file.path);
    if(typeof file.content!=="string" || new TextEncoder().encode(file.content).byteLength>MAX_FILE_BYTES) throw new TypeError("Invalid build file content");
    return Object.freeze({path:file.path,content:file.content});
  });
  if(!paths.has("index.html")) throw new TypeError("Build requires index.html");
  return Object.freeze({version:BUILD_MANIFEST_VERSION,project,files:Object.freeze(normalized)});
}
