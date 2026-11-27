import {assertLocks} from './intelligence-v4/locks.mjs';
import {createLogoClient} from './api-client.mjs?v=intelligent4';
import {createBrandAssistant} from './assistant.mjs?v=graphic3';
import {createProjects} from './projects.mjs';
import {createLayerEditor} from './layers.mjs?v=intelligent4';
import {renderVector} from './vector-canvas.mjs?v=graphic3';
import {downloadLogo} from './export.mjs?v=graphic3';
export function createWorkspace({supabase,dom=globalThis.document,onChange=()=>{}}){
 let intelligence=null;
 const projects=createProjects(supabase);
 const client=createLogoClient({getSession:async()=>{const {data,error}=await supabase.auth.getSession();if(error)throw Error('authentication_required');return data.session}});
 let editor=null,project=null,dirty=false,busy=false;
 const state=()=>({editor:editor?.state()??null,project:project?{id:project.id,name:project.name,revision:project.revision}:null,dirty,busy,assistant:assistant.state()});
 const emit=()=>{const s=state();onChange(s);return s};
 const assistant=createBrandAssistant({client,onChange:()=>emit()});
 const requireEditor=()=>{if(!editor)throw Error('empty');return editor};
 const guard=()=>{if(busy)throw Error('workspace_busy')};
 const task=async fn=>{guard();busy=true;emit();try{return await fn()}finally{busy=false;emit()}};
 const replace=(document,row=null,changed=true)=>{editor=createLayerEditor(document,{dom,validateChange:(a,b)=>assertLocks(a,b,intelligence?.contexts?.[assistant.state().selected??0]??{})});project=row;dirty=changed;return emit()};
 const protect=()=>{if(dirty)throw Error('unsaved')};
 const load=row=>{const {creativeGallery,intelligence:memory,...document}=row.document;
  intelligence=memory??null;
  if(creativeGallery){
   if(!Array.isArray(creativeGallery.variants)||creativeGallery.variants.length>12)throw Error('invalid_document');
   for(const v of creativeGallery.variants)renderVector(v.document,dom);
   assistant.restore(creativeGallery.variants,creativeGallery.selected);
  }else assistant.reset();
  return replace(document,row,false)};
 return Object.freeze({
 state,intelligence:()=>structuredClone(intelligence),async operation(input){return task(async()=>{
  protect();if(!project)throw Error('project_not_found');
  const slot=assistant.state().selected??0;
  const result=await client.edit({version:'4.0.0',revision:project.revision,projectId:project.id,slot,...input});
  if(result.revision!==project.revision)load(await projects.open(project.id));return result;
 })},list:()=>projects.list(),
 generate:input=>task(async()=>{protect();const result=await assistant.generate(input);if(result.status==='generated'){intelligence=null;replace(assistant.document())}return state()}),
 regenerate:()=>task(async()=>{
  if(Object.values(intelligence?.contexts?.[assistant.state().selected??0]?.locks??{}).some(v=>v.length))throw Error('locked_layer');
  const prior=requireEditor().state().document.creative;
  if(prior?.version!=='2.0.0'||typeof prior.brief!=='string')throw Error('invalid_document');
  const result=await assistant.generate({prompt:prior.brief,language:prior.language,graphic:requireEditor().state().document.graphic?.options,creative:{version:'2.0.0',seed:prior.seed,count:prior.count,slot:prior.slot,revision:prior.revision+1}});
  if(result.status==='generated')replace(assistant.document(),project,true);
  return state();
 }),
 cancel:()=>assistant.cancel(),
 variant:(index,{discardChanges=false}={})=>{guard();if(!discardChanges)protect();assistant.select(index);return replace(assistant.document(),project)},
 open:id=>task(async()=>{protect();const row=await projects.open(id);return load(row)}),
 newProject:()=>{guard();protect();intelligence=null;assistant.reset();return replace({version:'1.0.0',width:512,height:512,layers:[]})},
 discard:()=>{guard();intelligence=null;assistant.reset();editor=null;project=null;dirty=false;return emit()},
 edit:(operation,...args)=>{guard();if(!['replaceDocument','select','add','remove','duplicate','reorder','edit','transform','undo','redo'].includes(operation))throw Error('invalid_operation');const e=requireEditor(),before=e.state().revision;const result=e[operation](...args);if(result.revision!==before)dirty=true;return emit()},
 save:name=>task(async()=>{const doc=requireEditor().state().document;const a=assistant.state();
  if(doc.creative?.version==='2.0.0'&&a.variants[a.selected]){
   const variants=a.variants.map((v,i)=>i===a.selected?{...v,document:structuredClone(doc)}:v);
   doc.creativeGallery={variants,selected:a.selected};
  }
  if(intelligence)doc.intelligence=structuredClone(intelligence);
  project=project?await projects.save(project.id,project.revision,name,doc):await projects.create(name,doc);dirty=false;if(doc.creativeGallery)assistant.restore(doc.creativeGallery.variants,a.selected);return emit()}),
 remove:()=>task(async()=>{if(!project)throw Error('project_not_found');await projects.remove(project.id,project.revision);editor=null;project=null;dirty=false;assistant.reset();return emit()}),
 export:options=>task(()=>downloadLogo(requireEditor().state().document,options))
 });
}
