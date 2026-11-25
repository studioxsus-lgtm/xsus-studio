import {generateUnifiedProject} from './pipeline.mjs';
import {planMigration} from './fullstack.mjs';
import {buildArchive} from './build.mjs';
export async function orchestrateWebRequest({prompt,name,language='en'},{interpret,plan}={}){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>12000||typeof name!=='string'||!name.trim()||name.length>120||!['en','sq','fr'].includes(language))throw new TypeError('Invalid request');
 if(typeof interpret!=='function'||typeof plan!=='function')throw new TypeError('Planning adapters required');
 const intent=await interpret({prompt,name,language});
 if(!intent||typeof intent!=='object'||Array.isArray(intent))throw new TypeError('Invalid intent');
 if(intent.clarificationRequired===true)return {status:'clarification_required',reviewRequired:true,publicationAuthorized:false};
 const proposal=await plan({intent:structuredClone(intent),name,language,contractVersion:'1.0.0',executionAllowed:false});
 if(!proposal||proposal.contractVersion!=='1.0.0'||proposal.reviewRequired!==true||proposal.executable!==false)throw new Error('Invalid planning contract');
 const project=generateUnifiedProject({name,language,pages:proposal.pages,design:proposal.design});
 if(project.status!=='draft')return {status:'validation_failed',validation:project.validation,reviewRequired:true,publicationAuthorized:false};
 const migration=proposal.resources===undefined?null:planMigration(proposal.resources);
 const archive=buildArchive(project);
 return {status:'draft',project,migration,archive,reviewRequired:true,executable:false,publicationAuthorized:false,integrations:{language:'adapter',strategy:'adapter',runtimeConnected:false}};
}
