import {createHash,randomUUID} from 'node:crypto';
import {renderEditor} from '../editor.mjs';
import {brandCatalog,catalogMockup,catalogAnimation} from './catalog.mjs';
import {brandGuidelinesPDF} from './manual-pdf.mjs';
import {animatedSVG} from './motion-export.mjs';
import {animatedPNG} from './apng.mjs';
import {animatedGIF} from './gif.mjs';
import {animatedVideo} from './video.mjs';
import {structuredBrandPackage} from './structured-package.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function validateBrandIntent(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw TypeError('invalid_intent');
 const {action,name,language='en',profile='fade',mockup='flat:business-card',format='svg'}=input,c=brandCatalog();
 if(!['guidelines','mockup','animation','package'].includes(action)||typeof name!=='string'||!name.trim()||name.length>120||!['en','fr','sq'].includes(language)||!c.animation.includes(profile)||!c.mockups.some(m=>m.id===mockup)||!['svg','png','gif','mp4','webm'].includes(format))throw TypeError('invalid_intent');
 return {action,name:name.trim(),language,profile,mockup,format};
}
export async function planBrandAction(doc,{prompt,language='en',revision,interpret,plan}){
 renderEditor(doc);if(typeof prompt!=='string'||!prompt.trim()||prompt.length>4000||!['en','fr','sq'].includes(language)||!Number.isSafeInteger(revision)||revision<0||typeof interpret!=='function'||typeof plan!=='function')throw TypeError('invalid_request');
 const requestId=randomUUID(),sourceHash=hash(doc);
 const interpretation=await interpret({version:'5.0.0',operation:'brand.interpret',requestId,prompt,language});
 if(interpretation?.requestId!==requestId||interpretation.version!=='5.0.0')throw Error('core_correlation');
 const intent=validateBrandIntent(interpretation.intent);if(intent.language!==language)throw Error('language_mismatch');
 const digest=hash({sourceHash,revision,intent});
 const decision=await plan({version:'5.0.0',operation:'brand.plan',requestId,revision,sourceHash,intent,digest});
 if(decision?.requestId!==requestId||decision.version!=='5.0.0'||decision.digest!==digest)throw Error('core_correlation');
 return {version:'5.0.0',requestId,revision,sourceHash,intent,digest,status:decision.approved===true&&decision.review_required===false?'ready':'review_required'};
}
export async function executeBrandAction(doc,draft,{revision,approvalDigest}={}){
 renderEditor(doc);const intent=validateBrandIntent(draft?.intent);
 if(draft.status!=='ready'||draft.revision!==revision||draft.sourceHash!==hash(doc)||draft.digest!==hash({sourceHash:draft.sourceHash,revision,intent})||approvalDigest!==draft.digest)throw Error('approval_required');
 const {action,name,language,profile,mockup,format}=intent;
 if(action==='guidelines')return {mime:'application/pdf',bytes:brandGuidelinesPDF(doc,{name,language})};
 if(action==='mockup')return {mime:'image/svg+xml',bytes:Buffer.from(catalogMockup(doc,mockup).svg)};
 if(action==='package')return {mime:'application/zip',bytes:(await structuredBrandPackage(doc,{name,language,mockups:[mockup],animation:profile})).bytes};
 const t=catalogAnimation(doc,profile,{duration:2});
 if(format==='mp4'||format==='webm')return animatedVideo(doc,t,{format});
 if(format==='png')return {mime:'image/png',bytes:animatedPNG(doc,t)};
 if(format==='gif')return {mime:'image/gif',bytes:animatedGIF(doc,t)};
 return {mime:'image/svg+xml',bytes:Buffer.from(animatedSVG(doc,t))};
}
