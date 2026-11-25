import {createVisualEditor} from './editor.mjs';
export function createVisualController(spec,options){
 const editor=createVisualEditor(spec,options);
 let selected=editor.snapshot().pages[0].path;
 const listeners=new Set();
 const snapshot=()=>({...editor.snapshot(),selected});
 function notify(){for(const fn of listeners)try{fn(snapshot())}catch{}return snapshot()}
 function apply(method,args){editor[method](...args);return notify()}
 return Object.freeze({
 snapshot,
 subscribe(fn){if(typeof fn!=='function'||listeners.size>=100)throw TypeError('Invalid subscriber');listeners.add(fn);return ()=>listeners.delete(fn)},
 select(path){if(!editor.snapshot().pages.some(p=>p.path===path))throw Error('Page not found');selected=path;return notify()},
 design(patch,revision){if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!['palette','layout','density','motion'].includes(k)))throw TypeError('Invalid design patch');return apply('setDesign',[{...editor.snapshot().design,...patch},revision])},
 add(section,revision){return apply('addSection',[selected,section,revision])},
 edit(index,section,revision){return apply('editSection',[selected,index,section,revision])},
 remove(index,revision){return apply('removeSection',[selected,index,revision])},
 move(from,to,revision){return apply('moveSection',[selected,from,to,revision])},
 undo(revision){return apply('undo',[revision])},
 redo(revision){return apply('redo',[revision])},
 preview:()=>editor.preview(selected),
 export:()=>editor.export()
 });
}
