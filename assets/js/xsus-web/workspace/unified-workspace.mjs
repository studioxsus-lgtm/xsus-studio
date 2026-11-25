import {createWebClient} from './browser-client.mjs';
import {createWorkspaceController} from './workspace-controller.mjs';
import {importArchiveBlob} from './archive-import.mjs';
export function createUnifiedWorkspace({baseUrl,getToken,fetchImpl}={}){
 const client=createWebClient({baseUrl,getToken,fetchImpl});
 let metadata=null,busy=false,epoch=0;
 const workspace=createWorkspaceController({
 versions:{list:client.listVersions,get:client.getVersion,save:client.saveVersion},
 propose:input=>{
 const state=workspace.snapshot();
 if(!metadata||!state.id)throw Error('Workspace unavailable');
 return client.proposeVersion(state.id,{name:metadata.name,language:metadata.language,prompt:input.prompt,files:input.files,expectedRevision:state.revision});
 }
 });
 async function run(fn){if(busy||workspace.snapshot().busy)throw Error('Operation in progress');if(workspace.snapshot().dirty)throw Error('Unsaved changes');busy=true;const e=epoch;try{return await fn(()=>{if(e!==epoch)throw Error('Session changed')})}finally{if(e===epoch)busy=false}}
 async function load(id,details,check){
 if(!details||typeof details.name!=='string'||!details.name.trim()||details.name.length>120||!['en','sq','fr'].includes(details.language??'en'))throw TypeError('Invalid project details');
 const history=await client.listVersions(id);check();
 const initial=history.revision?undefined:(await importArchiveBlob(await client.download(id))).files;check();
 await workspace.open(id,initial);check();
 metadata={name:details.name,language:details.language??'en'};
 if(workspace.snapshot().dirty){await workspace.save();check();}
 return workspace.snapshot();
 }
 return Object.freeze({
 workspace,
 list:client.list,
 generate(input){return run(async check=>{const result=await client.generate(input);check();if(result?.job?.status!=='completed')throw Error('Draft unavailable');return load(result.job.id,input,check)})},
 open(id,details){return run(check=>load(id,details,check))},
 downloadOriginal(){const id=workspace.snapshot().id;if(!id)throw Error('Workspace unavailable');return client.download(id)},
 reset(){epoch++;busy=false;metadata=null;workspace.reset()},
 snapshot:()=>({busy:busy||workspace.snapshot().busy,metadata:metadata?{...metadata}:null,workspace:workspace.snapshot()})
 });
}
