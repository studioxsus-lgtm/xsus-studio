import {validateBuildManifest} from "../build/build-manifest.js";
export const BUILD_VERIFICATION_GATE_VERSION="0.1.0";
/** Preflight generated static projects before they reach an isolated executor. */
export function verifyStaticBuild(manifest){
 const artifact=validateBuildManifest(manifest);
 const byPath=new Map(artifact.files.map(file=>[file.path,file.content]));
 const html=byPath.get("index.html");
 if(!/<!doctype\s+html\s*>/i.test(html)||!/<html\b/i.test(html))throw new TypeError("Invalid static HTML entry");
 if(!/<main\b/i.test(html))throw new TypeError("Missing application main landmark");
 for(const path of ["styles.css","main.js"])if(!byPath.has(path))throw new TypeError("Missing static build dependency: "+path);
 if(!/<script\s+type="module"\s+src="\.\/main\.js"><\/script>/.test(html))throw new TypeError("Missing expected application entry script");
 if(!/<link\s+rel="stylesheet"\s+href="\.\/styles\.css">/.test(html))throw new TypeError("Missing expected application stylesheet");
 return Object.freeze({project:artifact.project,fileCount:artifact.files.length,verified:true});
}
