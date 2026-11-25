import {createSourceEditor} from './source-editor.mjs';
import {generateFromPrompt} from './intelligence.mjs';
export function createCoreRegeneration({transport,name,language='en'}={}){
 if(!transport||typeof transport.interpret!=='function'||typeof transport.plan!=='function'||typeof name!=='string'||!name.trim()||name.length>120||!['en','sq','fr'].includes(language))throw TypeError('Invalid regeneration configuration');
 return async function propose(input){
 if(!input||input.executionAllowed!==false||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>12000)throw TypeError('Invalid regeneration request');
 const original=createSourceEditor(input.files).snapshot().files;
 const target=/^(?:edit|modify|ndrysho|modifiko|modifier)\s+([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.html)\s*:\s*(.+)$/isu.exec(input.prompt.trim());
 if(target){
 const [,path,instruction]=target;
 if(!Object.hasOwn(original,path)||!instruction.trim())throw TypeError('Invalid contextual target');
 const title=/^(?:title|titulli|titre)\s*:\s*(.+)$/isu.exec(instruction.trim());
 if(!title||title[1].length>200)throw TypeError('Unsupported contextual edit; use title: new title');
 const escaped=title[1].replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
 if(!/<title>[^<]*<\/title>/i.test(original[path]))throw TypeError('Missing editable title');
 const files=createSourceEditor({...original,[path]:original[path].replace(/<title>[^<]*<\/title>/i,()=>'<title>'+escaped+'</title>')}).snapshot().files;
 return {files,baseRevision:input.revision,removedPaths:[],mode:'targeted-edit',contextualEditing:true,reviewRequired:true,executable:false,publicationAuthorized:false};
 }
 const result=await generateFromPrompt({prompt:input.prompt,name,language},transport);
 if(result.status!=='draft'||result.reviewRequired!==true||result.executable!==false||result.publicationAuthorized!==false)throw Error('Draft unavailable');
 const files=createSourceEditor(result.result.project.files).snapshot().files;
 const changes=Object.keys(original).filter(path=>!Object.hasOwn(files,path));
 return {files,baseRevision:input.revision,removedPaths:changes,mode:'replacement-draft',contextualEditing:false,reviewRequired:true,executable:false,publicationAuthorized:false};
 };
}
