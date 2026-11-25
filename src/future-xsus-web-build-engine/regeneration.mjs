import {createSourceEditor} from './source-editor.mjs';
export function createRegeneration({editor,propose}={}){
 if(!editor||typeof editor.snapshot!=='function'||typeof propose!=='function')throw TypeError('Invalid regeneration configuration');
 let pending=null,busy=false;
 return Object.freeze({
 async prepare(prompt){
 if(busy)throw Error('Regeneration in progress');
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>12000)throw TypeError('Invalid prompt');
 busy=true;pending=null;
 try{
 const base=editor.snapshot();
 const result=await propose({prompt:prompt.trim(),files:structuredClone(base.files),revision:base.revision,executionAllowed:false});
 if(result?.reviewRequired!==true||result.executable!==false)throw Error('Invalid proposal contract');
 const candidate=createSourceEditor(result.files).snapshot().files;
 const changes=[];
 for(const path of new Set([...Object.keys(base.files),...Object.keys(candidate)])){
 if(base.files[path]!==candidate[path])changes.push({path,operation:!Object.hasOwn(base.files,path)?'add':!Object.hasOwn(candidate,path)?'remove':'update'});
 }
 if(editor.snapshot().revision!==base.revision)throw Error('Revision conflict');
 pending={baseRevision:base.revision,files:candidate,changes,reviewRequired:true,publicationAuthorized:false};
 return structuredClone(pending);
 }finally{busy=false}
 },
 reject(){pending=null},
 accept(expected){
 if(!pending||expected!==pending.baseRevision||editor.snapshot().revision!==expected)throw Error('Revision conflict or missing proposal');
 const result=createSourceEditor(pending.files);pending=null;return result;
 },
 snapshot:()=>pending?structuredClone(pending):null
 });
}
