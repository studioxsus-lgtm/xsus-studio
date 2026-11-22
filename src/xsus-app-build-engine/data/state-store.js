export const STATE_STORE_VERSION="0.1.0";
function clone(value) {
  if(value===null || typeof value==="string" || typeof value==="boolean" || (typeof value==="number"&&Number.isFinite(value))) return value;
  if(Array.isArray(value)) return value.map(clone);
  if(value && typeof value==="object" && Object.getPrototypeOf(value)===Object.prototype) {
    const out=Object.create(null);
    for(const [key,item] of Object.entries(value)) {
      if(["__proto__","prototype","constructor"].includes(key)) throw new TypeError("Unsafe state key");
      out[key]=clone(item);
    }
    return out;
  }
  throw new TypeError("State must contain JSON-compatible values");
}
function freeze(value) {
  if(value && typeof value==="object") {for(const child of Object.values(value)) freeze(child);Object.freeze(value);}
  return value;
}
export function createStateStore(initialState={}) {
  if(!initialState || typeof initialState!=="object" || Array.isArray(initialState)) throw new TypeError("Initial state must be a plain object");
  let state=freeze(clone(initialState));let revision=0;
  const listeners=new Set();
  return Object.freeze({
    snapshot(){return Object.freeze({revision,state});},
    update(patch,{expectedRevision}={}) {
      if(expectedRevision!==undefined && expectedRevision!==revision) throw new Error("State revision conflict");
      if(!patch || typeof patch!=="object" || Array.isArray(patch)) throw new TypeError("Patch must be an object");
      const next=clone(patch);
      state=freeze(Object.assign(Object.create(null),state,next));
      revision++;
      const snapshot=Object.freeze({revision,state});
      for(const listener of [...listeners]) {try{listener(snapshot);}catch{ /* listener errors must not undo committed state */ }}
      return snapshot;
    },
    subscribe(listener) {
      if(typeof listener!=="function") throw new TypeError("Listener must be a function");
      listeners.add(listener);
      return ()=>listeners.delete(listener);
    }
  });
}
