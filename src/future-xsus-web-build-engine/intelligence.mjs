import {generateCustomWebsite} from './universal.mjs';
import {createBrandTokens} from './brand.mjs';
export async function generateFromPrompt({prompt,name,language='en'},{interpret,plan}={}){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>12000||typeof name!=='string'||!name.trim()||name.length>120||!['en','sq','fr'].includes(language)||typeof interpret!=='function'||typeof plan!=='function')throw TypeError('Invalid generation request');
 const request={contractVersion:'1.0.0',prompt:prompt.trim(),name:name.trim(),language,executionAllowed:false};
 const intent=await interpret(structuredClone(request));
 if(!intent||intent.contractVersion!=='1.0.0'||!['ready','clarification_required'].includes(intent.status))throw Error('Invalid interpretation');
 if(intent.status==='clarification_required'){
 if(!Array.isArray(intent.questions)||!intent.questions.length||intent.questions.length>10||intent.questions.some(q=>typeof q!=='string'||!q.trim()||q.length>1000))throw Error('Invalid clarification');
 return {status:'clarification_required',questions:[...intent.questions],executable:false,publicationAuthorized:false};
 }
 const strategy=await plan({contractVersion:'1.0.0',intent:structuredClone(intent),name:request.name,language,executionAllowed:false});
 if(!strategy||strategy.contractVersion!=='1.0.0'||strategy.reviewRequired!==true||strategy.executable!==false||!strategy.specification)throw Error('Invalid strategic plan');
 const spec=strategy.specification;
 const result=generateCustomWebsite({name:request.name,language,pages:spec.pages,resources:spec.resources,capabilities:spec.capabilities,design:spec.design});
 const brand=spec.brand===undefined?null:createBrandTokens(spec.brand);
 return {status:result.project.status,result,brand,brandApplied:false,reviewRequired:true,executable:false,publicationAuthorized:false};
}
