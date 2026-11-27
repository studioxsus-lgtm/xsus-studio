import {interpret as designIntent} from '../creative-v2/intent.mjs';
import {candidate,assertLocks} from './edit.mjs';
import {fingerprint,digest,view} from './fingerprint.mjs';
import {quality,reviewGallery,scaleProof} from './quality.mjs';
import {renderGraphic} from '../graphic-v3/scene.mjs';

const actions=new Set(['preview','apply','analyze','scales','undo','redo','restore','lock','unlock','prefer','rejectVariant','history']);
const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const keys=new Set(['version','action','requestId','projectId','revision','instruction','language','slot','selected','secondary','approval','kind','position','surface','improve']);
export function validate(r){
 if(!r||r.version!=='4.0.0'||!uuid.test(r.projectId)||!uuid.test(r.requestId)||!actions.has(r.action)||!['en','fr','sq'].includes(r.language)||!Number.isSafeInteger(r.revision)||r.revision<1||Object.keys(r).some(k=>!keys.has(k)))throw Error('invalid_request');
 if(r.slot!==undefined&&(!Number.isInteger(r.slot)||r.slot<0||r.slot>=12))throw Error('invalid_slot');
 for(const k of ['selected','secondary'])if(r[k]!=null&&(typeof r[k]!=='string'||!/^[a-z0-9_-]{1,80}$/i.test(r[k])||['constructor','prototype','__proto__'].includes(r[k])))throw Error('invalid_target');
 if(r.improve!==undefined&&typeof r.improve!=='boolean'||r.surface&&!/^#[a-f\d]{6}$/i.test(r.surface))throw Error('invalid_request');
 if(['preview','apply'].includes(r.action)&&!r.improve&&(typeof r.instruction!=='string'||!r.instruction.trim()||r.instruction.length>800))throw Error('invalid_instruction');
 if(r.action==='apply'&&!/^[a-f\d]{64}$/.test(r.approval))throw Error('approval_required');
}
const stable=o=>JSON.stringify(o,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const hash=o=>digest(stable(o));
function summary(m){return {cursor:m.cursor,events:m.events.map(({slot,op,requestId,targets,instruction})=>({slot,op,requestId,targets,instruction})),contexts:m.contexts,preferred:m.preferred,rejected:m.rejected}}
function delta(a,b){
 const rows=b.layers.filter(l=>hash(a.layers.find(x=>x.id===l.id)??null)!==hash(l));
 return {order:b.layers.map(l=>l.id),rows};
}
function replay(doc,d){const by=new Map([...doc.layers,...d.rows].map(l=>[l.id,l]));const layers=d.order.map(id=>by.get(id));if(layers.some(x=>!x))throw Error('history_conflict');return {...doc,layers}}
export async function projectAction(row,r,plan){
 validate(r);if(row.id!==r.projectId||row.revision!==r.revision)throw Error('project_conflict');
 const {creativeGallery,intelligence,...base}=structuredClone(row.document);
 const m=intelligence??{version:'4.0.0',events:[],cursor:0,contexts:{},preferred:[],rejected:[]};
 if(m.version!=='4.0.0'||!Array.isArray(m.events)||m.events.length>24)throw Error('invalid_history');
 const docs=creativeGallery?creativeGallery.variants.map(v=>v.document):[base],slot=r.slot??creativeGallery?.selected??0;
 if(!docs.length||docs.length>12||!docs[slot])throw Error('invalid_slot');
 const doc=docs[slot],c=doc.creative;
 const ctx=m.contexts[slot]??={locks:{},forbidden:c?.brief?designIntent(c.brief,{name:c.name??row.name},{version:'2.0.0'}).forbidden:[]};
 const result={version:'4.0.0',projectId:row.id,revision:r.revision,requestId:r.requestId};
 function write(){
  if(creativeGallery)docs.forEach((d,i)=>{creativeGallery.variants[i].document=d});
  const document={...docs[slot],...(creativeGallery?{creativeGallery:{...creativeGallery,selected:slot}}:{}),intelligence:m};
  if(Buffer.byteLength(JSON.stringify(document))>1850000)throw Error('history_storage_limit');
  return {result:{...result,history:summary(m)},document};
 }
 if(r.action==='history')return {result:{...result,history:summary(m)}};
 if(r.action==='analyze')return {result:{...result,...reviewGallery(docs,m,r.surface)}};
 if(r.action==='scales')return {result:{...result,scales:scaleProof(doc)}};
 if(['prefer','rejectVariant'].includes(r.action)){
  m.preferred=m.preferred.filter(i=>i!==slot);m.rejected=m.rejected.filter(i=>i!==slot);
  (r.action==='prefer'?m.preferred:m.rejected).push(slot);return write();
 }
 if(['lock','unlock'].includes(r.action)){
  if(!['layer','color','type'].includes(r.kind)||!doc.layers.some(l=>l.id===r.selected))throw Error('invalid_target');
  const locks=new Set(ctx.locks[r.selected]??[]);if(r.action==='lock')locks.add(r.kind);else locks.delete(r.kind);
  ctx.locks[r.selected]=[...locks];return write();
 }
 if(['undo','redo','restore'].includes(r.action)){
  const pos=r.action==='undo'?m.cursor-1:r.action==='redo'?m.cursor+1:r.position;
  if(!Number.isInteger(pos)||pos<0||pos>m.events.length||pos===m.cursor)throw Error('invalid_version');
  while(pos!==m.cursor){const reverse=pos<m.cursor,e=m.events[reverse?m.cursor-1:m.cursor],from=docs[e.slot];
   if(hash(from.layers)!==(reverse?e.afterId:e.beforeId))throw Error('history_conflict');
   const to=replay(from,reverse?e.before:e.after),context=m.contexts[e.slot];assertLocks(from,to,context);renderGraphic(view(to));
   docs[e.slot]=to;Object.assign(context,reverse?e.prior:e.next);m.cursor+=reverse?-1:1;
  }return write();
 }
 const subject=doc.layers.find(l=>l.id==='brand-name')?.text??row.name;
 const instruction=r.improve?'Improve design contrast and legibility':r.instruction;
 const strategy=await plan({name:subject,instruction,requestId:r.requestId,language:r.language});
 if(!strategy?.approved)throw Error('review_required');
 const input={document:doc,variants:docs,selected:r.selected,secondary:r.secondary,memory:ctx,requestId:r.requestId,instruction};
 let edit;
 if(r.improve){
  const evaluate=d=>quality(d,fingerprint(d),{surface:r.surface});
  const initial=evaluate(doc);let best=initial.score;
  for(const issue of initial.issues.slice(0,3)){
   const command=({small_type:'Make text larger',low_contrast:'Change color to '+((r.surface??'#ffffff')==='#000000'?'#ffffff':'#111111'),off_center:'Center the symbol'})[issue.code];
   if(!command)continue;
   try{const c=await candidate({...input,instruction:command,selected:issue.layer??r.selected});
    const score=evaluate(c.document).score;if(score>best){edit=c;best=score}
   }catch(err){if(!(err instanceof Error))throw err}
  }if(!edit)throw Error('no_verified_improvement');
 }else edit=await candidate(input);
 const {document:after,operation,targets,params}=edit;
 const approval=hash({project:row.id,slot,revision:row.revision,requestId:r.requestId,instruction,selected:r.selected??null,secondary:r.secondary??null,targets,params,layers:after.layers});
 const operationRecord={...result,slot,operation,targets,params,approval,verification:{valid:true,locksChecked:true,coreApproved:true}};
 if(r.action==='preview')return {result:{...operationRecord,before:doc,after}};
 if(approval!==r.approval)throw Error('proposal_changed');
 const prior={focus:ctx.focus??null,lastAdded:ctx.lastAdded??null,previousFonts:ctx.previousFonts??{}};
 const next={focus:edit.focus,lastAdded:edit.added??prior.lastAdded,previousFonts:{...prior.previousFonts}};
 for(const id of targets){const old=doc.layers.find(l=>l.id===id),n=after.layers.find(l=>l.id===id);if(old?.fontId&&n?.fontId!==old.fontId)next.previousFonts[id]=old.fontId}
 Object.assign(ctx,next);m.events.splice(m.cursor);
 m.events.push({requestId:r.requestId,instruction,slot,targets,op:operation,prior,next,beforeId:hash(doc.layers),afterId:hash(after.layers),before:delta(after,doc),after:delta(doc,after)});
 if(m.events.length>24)m.events.shift();m.cursor=m.events.length;docs[slot]=after;return write();
}
