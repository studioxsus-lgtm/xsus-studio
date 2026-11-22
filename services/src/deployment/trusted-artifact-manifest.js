// Build a deterministic integrity manifest ONLY from files supplied by a trusted server-side builder.
// This does not authenticate the source, extract browser snapshots, or deploy anything.
import {createHash} from 'node:crypto';
const NAMES=Object.freeze(['index.html','styles.css','app.js']);
const MAX_FILE=1024*1024;
const MAX_TOTAL=2*1024*1024;
export function createTrustedArtifactManifest(files) {
 if(!files || typeof files!=='object' || Array.isArray(files) ||
    Object.keys(files).length!==NAMES.length ||
    !NAMES.every(name=>Object.hasOwn(files,name) && typeof files[name]==='string'))
   throw new TypeError('Exactly three server-generated text artifacts are required');
 let total=0;
 const records=NAMES.map(name=>{
  const bytes=Buffer.from(files[name],'utf8');
  total+=bytes.length;
  if(bytes.length>MAX_FILE || total>MAX_TOTAL) throw new RangeError('Trusted artifact size limit exceeded');
  return Object.freeze({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 });
 return Object.freeze({schemaVersion:1,verifiedSource:false,deployable:false,
   files:Object.freeze(records)});
}
