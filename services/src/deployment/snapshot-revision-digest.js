// Canonical digest of a persisted JSONB snapshot. Key order is not a revision.
// Inputs must originate from an owner-scoped server-side database read.
import {createHash} from 'node:crypto';
const MAX_BYTES=4194304;
function canonical(value) {
 if(value===null||typeof value==='string'||typeof value==='boolean') return JSON.stringify(value);
 if(typeof value==='number') {
  if(!Number.isFinite(value)) throw new TypeError('Invalid JSON number');
  return JSON.stringify(value);
 }
 if(Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
 if(typeof value==='object') {
  const keys=Object.keys(value).sort();
  return '{'+keys.map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 }
 throw new TypeError('Unsupported JSON value');
}
export function digestPersistedSnapshot(snapshot) {
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)) return null;
 try {
  const serialized=canonical(snapshot);
  if(Buffer.byteLength(serialized,'utf8')>MAX_BYTES) return null;
  return createHash('sha256').update(serialized,'utf8').digest('hex');
 } catch {return null;}
}
