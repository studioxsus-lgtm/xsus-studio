import {options,interpret as designIntent,inks} from './creative-v2/intent.mjs';
import {composeCreative} from './creative-v2/compose.mjs';
import {requestedTheme} from './thematic-symbols.mjs';
import {catalogRequest} from './symbol-catalog.mjs';
import {textColor} from './design.mjs';
import {readMotif} from './motif.mjs';
import {brandKit} from './brand.mjs';
const VERSION='1.0.0';
function quoteExplicitWordmark(prompt) {
 if (/["“”«»]/u.test(prompt) || prompt.length > 3998) return prompt;
 const cue = /\b(?:the word|le mot|fjal[ëe]n)\s+/giu;
 const names = [];
 for (const match of prompt.matchAll(cue)) {
   const start = match.index + match[0].length;
   const name = prompt.slice(start).match(/^([\p{Lu}][\p{Lu}\p{N}-]{1,39})(?=\s+(?:in|on|below|under|as|en|avec|sous|me|në)\b|[.,;:!?]|$)/u)?.[1];
   if (name) names.push({start,name});
 }
 if (!names.length || new Set(names.map(item=>item.name)).size !== 1) return prompt;
 const {start,name} = names[0];
 return prompt.slice(0,start) + '"' + name + '"' + prompt.slice(start+name.length);
}
export function createOrchestrator({interpret,plan}={}){
 if(typeof interpret!=='function'||typeof plan!=='function')throw new TypeError('Both core adapters required');
 return Object.freeze({async generate({prompt,language='en',requestId,creative}={}){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>4000||!['en','fr','sq'].includes(language)||typeof requestId!=='string'||! /^[a-zA-Z0-9_-]{1,80}$/.test(requestId))throw new TypeError('Invalid request');
 if(creative!==undefined)options(creative);
 const check=r=>{if(!r||r.version!==VERSION||r.requestId!==requestId)throw new Error('Invalid core response');return r};
 const briefText=prompt.replace(/\n\[XSUS symbol: [a-z0-9-]+\]$/,'');
 const result=check(await interpret({version:VERSION,requestId,operation:'logo.interpret',prompt:quoteExplicitWordmark(briefText),language}));
 const b=result.brief;
 if(!b||typeof b.name!=='string'||b.name.length>120)throw new Error('Invalid brief');
 if(result.clarification_required===true||!b.name.trim())return {version:VERSION,requestId,status:'review_required',reasons:['missing_brand_name']};
 const motif=readMotif(briefText,b.name);
 const theme=requestedTheme(briefText,b.name);
 const catalogId=briefText!==prompt || (!motif && !theme) ? catalogRequest(prompt,b.name) : null;
 const planBrief={name:b.name,primary:b.primary,secondary:b.secondary,industry:b.industry,style:b.style};
 if(creative){
  const intent=designIntent(prompt,b,creative);
  if(intent.unknown.length)return {version:VERSION,requestId,status:'review_required',reasons:['unsupported_exclusion']};
  if(intent.colors[0])planBrief.primary=inks[intent.colors[0]];
  else if(intent.profile)planBrief.primary=intent.profile.primary;
  if(intent.colors[1])planBrief.secondary=inks[intent.colors[1]];
  if(intent.traits.style.length)planBrief.style=intent.traits.style[0];
 }
 const assess=async brief=>check(await plan({version:VERSION,requestId,operation:'logo.plan',brief}));
 let strategy=await assess(planBrief);
 let accent;
 // Verify legibility against a contrasting surface when the two requested inks are accents.
 if((motif || catalogId || creative) && strategy.review_required && strategy.reasons?.length===1 &&
    strategy.reasons[0]==='low_palette_contrast' && /^#[0-9a-f]{6}$/i.test(b.primary) &&
    /^#[0-9a-f]{6}$/i.test(b.secondary)){
   accent=b.secondary;
   strategy=await assess({...planBrief,secondary:textColor(b.primary)});
 }
 if(strategy.review_required!==false)return {version:VERSION,requestId,status:'review_required',reasons:strategy.reasons};
 if(strategy.approved!==true)throw new Error('Plan not approved');
 if(creative)return {version:VERSION,requestId,...await composeCreative({prompt,language,brief:b,strategy,creative})};
 const kit=brandKit({name:b.name,primary:strategy.primary??b.primary??undefined,
   secondary:accent??strategy.secondary??b.secondary??undefined,motif,prompt:briefText,theme,catalogId});
 return {version:VERSION,requestId,status:'generated',kit};
 }});
}
