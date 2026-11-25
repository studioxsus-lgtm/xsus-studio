import {brandKit} from './brand.mjs';
const VERSION='1.0.0';
export function createOrchestrator({interpret,plan}={}){
 if(typeof interpret!=='function'||typeof plan!=='function')throw new TypeError('Both core adapters required');
 return Object.freeze({async generate({prompt,language='en',requestId}={}){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>4000||!['en','fr','sq'].includes(language)||typeof requestId!=='string'||! /^[a-zA-Z0-9_-]{1,80}$/.test(requestId))throw new TypeError('Invalid request');
 const check=r=>{if(!r||r.version!==VERSION||r.requestId!==requestId)throw new Error('Invalid core response');return r};
 const result=check(await interpret({version:VERSION,requestId,operation:'logo.interpret',prompt,language}));
 const b=result.brief;
 if(!b||typeof b.name!=='string'||b.name.length>120)throw new Error('Invalid brief');
 if(result.clarification_required===true||!b.name.trim())return {version:VERSION,requestId,status:'review_required',reasons:['missing_brand_name']};
 const strategy=check(await plan({version:VERSION,requestId,operation:'logo.plan',brief:{name:b.name,primary:b.primary,secondary:b.secondary,industry:b.industry,style:b.style}}));
 if(strategy.review_required!==false)return {version:VERSION,requestId,status:'review_required'};
 if(strategy.approved!==true)throw new Error('Plan not approved');
 const kit=brandKit({name:b.name,primary:strategy.primary??b.primary??undefined,secondary:strategy.secondary??b.secondary??undefined});
 return {version:VERSION,requestId,status:'generated',kit};
 }});
}
