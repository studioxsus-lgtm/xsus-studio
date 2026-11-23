import { t } from './i18n/language-manager.js';
import { $, $$, refreshIcons } from './state.js';
import { readWorkspacePart } from './refresh-state.js?v=20261122-unified2';
import { findGeneratedSourceRevision } from './generated-source-history.js';
const FILES=['index.html','styles.css','main.js'];
let selected=null,view='timeline',previousFocus;
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function active(){
  const builder=readWorkspacePart('builder');
  return builder.sessions.find(s=>s.id===builder.activeId);
}
function versions(){return (active()?.generatedSourceHistory||[]).filter(v=>findGeneratedSourceRevision([v],v?.id)).slice().reverse();}
function render(){
  const entries=versions(),list=$('#vhTimeline'),detail=$('#vhDetails');
  if(!entries.some(v=>v.id===selected))selected=entries[0]?.id||null;
  list.innerHTML=entries.length?entries.map((v,i)=>`<button type="button" class="vh-entry ${v.id===selected?'active':''}" data-vh-id="${safe(v.id)}" aria-pressed="${v.id===selected}"><i data-lucide="git-commit-horizontal"></i><span><strong>${safe(t('Version'))} ${entries.length-i}</strong><small>${safe(new Date(v.createdAt).toLocaleString(document.documentElement.lang))}</small></span></button>`).join(''):`<p>${safe(t('No saved code versions yet. Generate an app and apply a code change.'))}</p>`;
  const chosen=entries.find(v=>v.id===selected);
  if(!chosen){detail.innerHTML='<p>'+safe(t('No saved code versions yet.'))+'</p>';}
  else if(view==='timeline'){
    detail.innerHTML=`<span class="vh-tag">${safe(t('Saved source checkpoint'))}</span><h3>${safe(new Date(chosen.createdAt).toLocaleString(document.documentElement.lang))}</h3><p>${safe(t('Contains index.html, styles.css and main.js.'))}</p><button class="vh-action" id="vhRestore" type="button"><i data-lucide="rotate-ccw"></i> ${safe(t('Restore this version'))}</button>`;
  }else if(view==='compare'){
    const current=active()?.generatedFiles;
    const previous=chosen.files;
    detail.innerHTML='<h3>'+safe(t('Compare saved version with current code'))+'</h3>'+FILES.map(path=>`<p><strong>${path}</strong>: ${safe(current?.[path]===previous[path]?t('Unchanged'):t('Changed'))}</p>`).join('');
  }else{
    detail.innerHTML='<h3>'+safe(t('Saved source activity'))+'</h3>'+entries.map(v=>`<p>${safe(new Date(v.createdAt).toLocaleString(document.documentElement.lang))}</p>`).join('');
  }
  $$('.vh-tabs button').forEach(b=>{const on=b.dataset.vhView===view;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
  refreshIcons();
}
function close(){const overlay=$('#vhOverlay');overlay.classList.add('hidden');document.body.style.overflow='';previousFocus?.focus?.();}
function open(){previousFocus=document.activeElement;$('#vhOverlay').classList.remove('hidden');document.body.style.overflow='hidden';view='timeline';selected=null;render();$('#vhClose').focus();}
export function initVersionHistory(){
 const overlay=$('#vhOverlay');if(!overlay)return;
 document.addEventListener('xsus:open-version-history',open);
 document.addEventListener('xsus:generated-revision-restored',()=>{if(!overlay.classList.contains('hidden'))render();});
 $('#vhClose').addEventListener('click',close);$('#vhDone').addEventListener('click',close);
 overlay.addEventListener('click',event=>{
   if(event.target===overlay){close();return;}
   const entry=event.target.closest('[data-vh-id]');
   if(entry){selected=entry.dataset.vhId;render();return;}
   const tab=event.target.closest('[data-vh-view]');
   if(tab){view=tab.dataset.vhView;render();return;}
   if(event.target.closest('#vhRestore')&&selected){
     if(!window.confirm(t('Restore this saved version? Current code will be kept in history.')))return;
     document.dispatchEvent(new CustomEvent('xsus:restore-generated-revision',{detail:{id:selected}}));
     close();
   }
 });
 document.addEventListener('xsus:language-changed',()=>{if(!overlay.classList.contains('hidden'))render();});
 document.addEventListener('keydown',event=>{
   if(overlay.classList.contains('hidden'))return;
   if(event.key==='Escape'){event.preventDefault();close();}
   if(event.key==='Tab'){
     const nodes=[...overlay.querySelectorAll('button:not([disabled]),select:not([disabled])')].filter(el=>el.getClientRects().length);
     if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);
     if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
     else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
 });
}
