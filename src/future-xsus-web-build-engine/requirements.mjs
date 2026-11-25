import {prepareExport} from './quality.mjs';
const rules={commerce:/\b(shop|store|e-commerce|dyqan|produkte|boutique|commerce)\b/iu,education:/\b(school|course|education|shkollë|kurse|école|formation)\b/iu,dashboard:/\b(dashboard|analytics|analitik|tableau de bord)\b/iu,portfolio:/\b(portfolio|portofol|portefeuille)\b/iu,blog:/\b(blog|articles|artikuj|lajme|actualités)\b/iu,business:/\b(business|company|biznes|kompani|entreprise)\b/iu};
const capabilities={authentication:/\b(login|auth|accounts|llogari|connexion|comptes)\b/iu,database:/\b(database|databazë|base de données)\b/iu,payments:/\b(payments|checkout|pagesa|paiement)\b/iu,api:/\b(api|backend|serveur|server)\b/iu};
export function analyzeRequirements({prompt,name,language='en',type}={}){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>12000)throw new TypeError('Invalid prompt');
 if(typeof name!=='string'||!name.trim()||name.length>120)throw new TypeError('Invalid name');
 if(!['en','sq','fr'].includes(language))throw new TypeError('Invalid language');
 if(type!==undefined&&!Object.hasOwn(rules,type))throw new TypeError('Invalid type');
 const matches=Object.keys(rules).filter(k=>rules[k].test(prompt));
 const requested=Object.keys(capabilities).filter(k=>capabilities[k].test(prompt));
 const selected=type??(matches.length===1?matches[0]:null);
 return {name,language,type:selected,candidates:matches,requested,unimplemented:requested.slice(),clarificationRequired:!selected,reviewRequired:true,executable:false};
}
export function generateFromRequirements(input){
 const requirements=analyzeRequirements(input);
 if(requirements.clarificationRequired)return {status:'clarification_required',requirements};
 if(requirements.unimplemented.length)return {status:'capability_required',requirements};
 const draft=prepareExport({name:requirements.name,type:requirements.type,language:requirements.language});
 return {status:'draft',requirements,...draft};
}
