import {renderVector} from './vector-canvas.mjs?v=graphic3';
import {editProperties,transformLayer} from './properties.mjs?v=graphic3';
export function createLayerEditor(initial,{dom=globalThis.document,historyLimit=50,validateChange=()=>{}}={}){
 if(!Number.isInteger(historyLimit)||historyLimit<1||historyLimit>100)throw Error('invalid_history_limit');
 const clone=structuredClone;
 renderVector(initial,dom);
 let current=clone(initial),past=[],future=[],selected=null,revision=0;
 const snapshot=()=>({document:clone(current),selected,revision,canUndo:past.length>0,canRedo:future.length>0});
 const commit=(next,selection=selected)=>{validateChange(current,next);renderVector(next,dom);past.push({document:current,selected});if(past.length>historyLimit)past.shift();future=[];current=clone(next);selected=current.layers.some(l=>l.id===selection)?selection:null;revision++;return snapshot()};
 const index=id=>{const i=current.layers.findIndex(l=>l.id===id);if(i<0)throw Error('layer_not_found');return i};
 return Object.freeze({
 state:snapshot,
 replaceDocument:(document,selection)=>commit(document,selection),
 select(id){if(id!==null)index(id);selected=id;return snapshot()},
 add(layer){const next=clone(current);next.layers.push(clone(layer));return commit(next,layer.id)},
 remove(id){const next=clone(current);next.layers.splice(index(id),1);return commit(next)},
 duplicate(id,newId){const next=clone(current),i=index(id);next.layers.splice(i+1,0,{...clone(next.layers[i]),id:newId});return commit(next,newId)},
 reorder(id,to){const i=index(id);if(!Number.isInteger(to)||to<0||to>=current.layers.length)throw Error('invalid_position');if(i===to)return snapshot();const next=clone(current);const [layer]=next.layers.splice(i,1);next.layers.splice(to,0,layer);return commit(next)},
 edit(id,patch){return commit(editProperties(current,id,patch,dom),id)},
 transform(id,options){return commit(transformLayer(current,id,options,dom),id)},
 undo(){if(!past.length)return snapshot();validateChange(current,past.at(-1).document);future.push({document:current,selected});const previous=past.pop();current=previous.document;selected=previous.selected;revision++;return snapshot()},
 redo(){if(!future.length)return snapshot();validateChange(current,future.at(-1).document);past.push({document:current,selected});const next=future.pop();current=next.document;selected=next.selected;revision++;return snapshot()}
 });
}
