// Canonical digest of a persisted JSONB snapshot. Key order is not a revision.
// Inputs must originate from an owner-scoped server-side database read.
import {createHash} from 'node:crypto';
const MAX_BYTES=4194304;
function canonical(value,depth=0,seen=new WeakSet()) {
 if(depth>64) throw new RangeError('Snapshot nesting limit exceeded');
 if(value===null||typeof value==='string'||typeof value==='boolean') return JSON.stringify(value);
 if(typeof value==='number') {
  if(!Number.isFinite(value)) throw new TypeError('Invalid JSON number');
  return JSON.stringify(value);
 }
 if(Array.isArray(value)) {
  if(seen.has(value)) throw new TypeError('Cyclic snapshot');
  seen.add(value);
  const result='['+value.map(item=>canonical(item,depth+1,seen)).join(',')+']';
  seen.delete(value);
  return result;
 }
 if(typeof value==='object') {
  if(seen.has(value)) throw new TypeError('Cyclic snapshot');
  seen.add(value);
  const keys=Object.keys(value).sort();
  const result='{'+keys.map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1,seen)).join(',')+'}';
  seen.delete(value);
  return result;
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
