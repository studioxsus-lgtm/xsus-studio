import {validateProject} from './quality.mjs';
import {createHash} from 'node:crypto';
import {Script} from 'node:vm';
export function inspectDraft(files){
 const validation=validateProject(files),findings=[];
 for(const [path,source] of Object.entries(files)){
 if(typeof source!=='string')throw new TypeError('Invalid source');
 if(path.endsWith('.html')){
 if(!/<meta\s+charset=/i.test(source))findings.push({path,code:'MISSING_CHARSET',repairable:/<head>/i.test(source)});
 if(/\son[a-z]+\s*=|javascript\s*:|<iframe\b|<object\b/i.test(source))findings.push({path,code:'ACTIVE_CONTENT_REVIEW',repairable:false});
 }
 if(path.endsWith('.js')){
 try{new Script(source,{filename:path})}catch{findings.push({path,code:'SCRIPT_SYNTAX_OR_MODULE',repairable:false})}
 }
 }
 return {validation,findings,reviewRequired:true,executed:false};
}
export function repairDraft(project){
 if(project?.status!=='draft'||project.publicationAuthorized!==false)throw new TypeError('Invalid draft');
 const files=Object.assign(Object.create(null),project.files),before=inspectDraft(files),changes=[];
 for(const finding of before.findings){
 if(finding.code==='MISSING_CHARSET'&&finding.repairable){
 files[finding.path]=files[finding.path].replace(/<head>/i,'$&<meta charset="utf-8">');
 changes.push({path:finding.path,code:finding.code});
 }
 }
 const after=inspectDraft(files);
 const manifest=Object.keys(files).sort().map(path=>({path,bytes:Buffer.byteLength(files[path]),sha256:createHash('sha256').update(files[path]).digest('hex')}));
 return {status:after.validation.valid&&!after.findings.length?'draft':'review_required',files,manifest,changes,before,after,reviewRequired:true,executable:false,publicationAuthorized:false};
}
