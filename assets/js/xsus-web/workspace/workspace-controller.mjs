import {createSourceEditor} from './source-editor.mjs';
import {createRegeneration} from './regeneration.mjs';
export function createWorkspaceController({versions,propose}={}){
 if(!versions||['list','get','save'].some(k=>typeof versions[k]!=='function')||typeof propose!=='function')throw TypeError('Invalid workspace adapters');
 let editor=null,regeneration=null,id=null,revision=0,dirty=false,busy=false,epoch=0;
 const listeners=new Set();
 const snapshot=()=>({id,revision,dirty,busy,source:editor?.snapshot()??null,proposal:regeneration?.snapshot()??null});
 function notify(){for(const fn of listeners)try{fn(snapshot())}catch{}return snapshot()}
 function ready(){if(busy||!editor)throw Error('Workspace unavailable')}
 function install(next){editor=next;regeneration=createRegeneration({editor,propose})}
 async function run(work){if(busy)throw Error('Operation in progress');const e=epoch;busy=true;notify();try{const apply=await work();if(e!==epoch)throw Error('Session changed');apply()}finally{if(e===epoch){busy=false;notify()}}return snapshot()}
 return Object.freeze({
 snapshot,
 subscribe(fn){if(typeof fn!=='function'||listeners.size>=100)throw TypeError('Invalid subscriber');listeners.add(fn);return ()=>listeners.delete(fn)},
 reset(){epoch++;editor=null;regeneration=null;id=null;revision=0;dirty=false;busy=false;return notify()},
 open(projectId,initial){if(dirty)throw Error('Unsaved changes');if(typeof projectId!=='string'||!projectId)throw TypeError('Invalid project');return run(async()=>{const history=await versions.list(projectId);if(!Number.isSafeInteger(history.revision)||history.revision<0)throw Error('Invalid history');const files=history.revision?(await versions.get(projectId,history.revision)).files:initial;const next=createSourceEditor(files);return ()=>{id=projectId;revision=history.revision;dirty=!revision;install(next)}})},
 edit(method,...args){ready();if(!['update','add','remove','undo','redo'].includes(method))throw TypeError('Invalid edit');editor[method](...args);regeneration.reject();dirty=true;return notify()},
 save(){ready();const projectId=id,expected=revision,files=editor.snapshot().files;return run(async()=>{const result=await versions.save(projectId,files,expected);if(result.revision!==expected+1)throw Error('Invalid saved revision');return ()=>{revision=result.revision;dirty=false}})},
 prepare(prompt){ready();const r=regeneration;return run(async()=>{await r.prepare(prompt);return ()=>{}})},
 reject(){ready();regeneration.reject();return notify()},
 accept(expected){ready();install(regeneration.accept(expected));dirty=true;return notify()}
 });
}
