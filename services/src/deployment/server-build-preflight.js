// Server-side static checks for artifacts from an authenticated, trusted builder.
// No JS execution, no browser snapshot extraction, no provider deployment.
import {createTrustedArtifactManifest} from './trusted-artifact-manifest.js';
export function inspectServerBuild(files) {
 let manifest;
 try { manifest=createTrustedArtifactManifest(files); }
 catch {return Object.freeze({ok:false,deployable:false,manifest:null,issues:Object.freeze(['INVALID_ARTIFACT_SET'])});}
 const html=files['index.html'];
 const issues=[];
 if(!/<html(?:\s|>)/i.test(html)||!/<head(?:\s|>)/i.test(html)||
    !/<body(?:\s|>)/i.test(html)||!/<\/head\s*>/i.test(html)||
    !/<\/body\s*>/i.test(html)||!/<\/html\s*>/i.test(html)) issues.push('INVALID_HTML_STRUCTURE');
 for(const name of ['index.html','styles.css','app.js'])
  if(!files[name].trim()) issues.push('EMPTY_ARTIFACT');
 // A passing preflight is not authorization, provenance, or deployment approval.
 return Object.freeze({ok:issues.length===0,deployable:false,manifest,
  issues:Object.freeze(issues)});
}
