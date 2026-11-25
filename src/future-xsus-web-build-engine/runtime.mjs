const keyPattern=/^[a-z][a-z0-9_]{0,62}$/;
function key(k){if(typeof k!=='string'||!keyPattern.test(k)||['constructor','prototype','__proto__'].includes(k))throw new TypeError('Invalid state key');return k}
function scalar(v){if(v!==null&&typeof v!=='boolean'&&!(typeof v==='number'&&Number.isFinite(v))&&!(typeof v==='string'&&v.length<=10000))throw new TypeError('Invalid state value');return v}
export function createApplicationState(initial={}){
 let state=Object.create(null),revision=0;const listeners=new Set();
 for(const [k,v] of Object.entries(initial))state[key(k)]=scalar(v);
 const snapshot=()=>({revision,values:{...state}});
 return Object.freeze({snapshot,update(patch,expected){if(expected!==revision)throw new Error('Revision conflict');const next=Object.assign(Object.create(null),state);for(const [k,v] of Object.entries(patch)){key(k);if(!Object.hasOwn(state,k))throw new Error('Unknown state key');next[k]=scalar(v)}state=next;revision++;for(const fn of [...listeners]){try{fn(snapshot())}catch{/* observer cannot roll back committed state */}}return snapshot()},subscribe(fn){if(typeof fn!=='function'||listeners.size>=100)throw new TypeError('Invalid subscriber');listeners.add(fn);return ()=>listeners.delete(fn)}});
}
export function bindApplication({container,store}){
 if(!container||typeof container.querySelectorAll!=='function')throw new TypeError('Invalid container');
 const outputs=[...container.querySelectorAll('[data-xs-text]')],inputs=[...container.querySelectorAll('[data-xs-input]')];
 const initial=store.snapshot().values;
 for(const el of [...outputs,...inputs]){const k=key(el.getAttribute(el.hasAttribute('data-xs-text')?'data-xs-text':'data-xs-input'));if(!Object.hasOwn(initial,k))throw new Error('Unknown binding')}
 function render({values}){for(const el of outputs)el.textContent=String(values[el.getAttribute('data-xs-text')]??'');for(const el of inputs){const v=values[el.getAttribute('data-xs-input')];if(el.type==='checkbox')el.checked=Boolean(v);else el.value=String(v??'')}}
 const handlers=inputs.map(el=>{const fn=()=>{const k=el.getAttribute('data-xs-input'),s=store.snapshot(),old=s.values[k];const v=typeof old==='boolean'?el.checked:typeof old==='number'?Number(el.value):el.value;try{store.update({[k]:v},s.revision)}catch{render(store.snapshot())}};el.addEventListener('change',fn);return [el,fn]});
 const unsubscribe=store.subscribe(render);render(store.snapshot());
 return ()=>{unsubscribe();for(const [el,fn] of handlers)el.removeEventListener('change',fn)};
}
