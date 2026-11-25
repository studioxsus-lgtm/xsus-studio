import {generateFromPrompt} from './intelligence.mjs';
export async function verifyCoreCompatibility({interpret,plan}={}){
 if(typeof interpret!=='function'||typeof plan!=='function')throw TypeError('Invalid core adapters');
 const stages={future:'not_checked',hyper:'not_checked',build:'not_checked'};
 try{
 const result=await generateFromPrompt({name:'Compatibility probe',prompt:'Create a simple two-page informational website with Home and About pages. Draft only.',language:'en'},{
 interpret:async request=>{const response=await interpret(request);if(response?.contractVersion!=='1.0.0'||response.status!=='ready'){stages.future='incompatible';throw Error('Future contract mismatch')}stages.future='compatible';return response},
 plan:async request=>{const response=await plan(request);if(response?.contractVersion!=='1.0.0'||response.reviewRequired!==true||response.executable!==false||!response.specification){stages.hyper='incompatible';throw Error('Hyper contract mismatch')}stages.hyper='compatible';return response}
 });
 stages.build=result.status==='draft'&&result.result?.project?.validation?.valid===true?'compatible':'incompatible';
 }catch{const next=Object.keys(stages).find(k=>stages[k]==='not_checked');if(next&&!Object.values(stages).includes('incompatible'))stages[next]='failed'}
 return {compatible:Object.values(stages).every(s=>s==='compatible'),stages,publicationAuthorized:false,executable:false};
}
