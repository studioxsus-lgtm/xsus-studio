import {createLogoClient} from './api-client.mjs';
import {createBrandAssistant} from './assistant.mjs';
import {createProjects} from './projects.mjs';
import {createLayerEditor} from './layers.mjs';
import {downloadLogo} from './export.mjs';
export function createWorkspace({supabase,dom=globalThis.document,onChange=()=>{}}){
 const projects=createProjects(supabase);
 const client=createLogoClient({getSession:async()=>{const {data,error}=await supabase.auth.getSession();if(error)throw Error('authentication_required');return data.session}});
 let editor=null,project=null,dirty=false,busy=false;
 const state=()=>({editor:editor?.state()??null,project:project?{id:project.id,name:project.name,revision:project.revision}:null,dirty,busy,assistant:assistant.state()});
 const emit=()=>{const s=state();onChange(s);return s};
 const assistant=createBrandAssistant({client,onChange:()=>emit()});
 const requireEditor=()=>{if(!editor)throw Error('empty');return editor};
 const guard=()=>{if(busy)throw Error('workspace_busy')};
 const task=async fn=>{guard();busy=true;emit();try{return await fn()}finally{busy=false;emit()}};
 const replace=(document,row=null,changed=true)=>{editor=createLayerEditor(document,{dom});project=row;dirty=changed;return emit()};
 const protect=()=>{if(dirty)throw Error('unsaved')};
 return Object.freeze({
 state,list:()=>projects.list(),
 generate:input=>task(async()=>{protect();const result=await assistant.generate(input);if(result.status==='generated')replace(assistant.document());return state()}),
 cancel:()=>assistant.cancel(),
 variant:(index,{discardChanges=false}={})=>{guard();if(!discardChanges)protect();assistant.select(index);return replace(assistant.document(),project)},
 open:id=>task(async()=>{protect();const row=await projects.open(id);assistant.reset();return replace(row.document,row,false)}),
 newProject:()=>{guard();protect();assistant.reset();return replace({version:'1.0.0',width:512,height:512,layers:[]})},
 discard:()=>{guard();assistant.reset();editor=null;project=null;dirty=false;return emit()},
 edit:(operation,...args)=>{guard();if(!['select','add','remove','duplicate','reorder','edit','transform','undo','redo'].includes(operation))throw Error('invalid_operation');const e=requireEditor(),before=e.state().revision;const result=e[operation](...args);if(result.revision!==before)dirty=true;return emit()},
 save:name=>task(async()=>{const doc=requireEditor().state().document;project=project?await projects.save(project.id,project.revision,name,doc):await projects.create(name,doc);dirty=false;return emit()}),
 remove:()=>task(async()=>{if(!project)throw Error('project_not_found');await projects.remove(project.id,project.revision);editor=null;project=null;dirty=false;assistant.reset();return emit()}),
 export:options=>task(()=>downloadLogo(requireEditor().state().document,options))
 });
}
