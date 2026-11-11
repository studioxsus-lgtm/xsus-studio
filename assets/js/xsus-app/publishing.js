import { t } from './i18n/language-manager.js';
// XSUS App — local, design-only publishing interface. No network or deployment calls.
const byId = id => document.getElementById(id);
const tabs = ['overview','configuration','releases'];
export function initPublishing() {
  const overlay=byId('pubOverlay'); if (!overlay) return;
  const dialog=overlay.querySelector('.pub-dialog'); let previousFocus=null;
  function tab(name) { tabs.forEach(t=>{const button=overlay.querySelector(`[data-pub-tab="${t}"]`);button.classList.toggle('active',t===name);button.setAttribute('aria-selected',String(t===name));overlay.querySelector(`[data-pub-view="${t}"]`).classList.toggle('hidden',t!==name);}); }
  function close() {overlay.classList.add('hidden');document.body.classList.remove('pub-lock');previousFocus?.focus?.();}
  function open() {previousFocus=document.activeElement;tab('overview');overlay.classList.remove('hidden');document.body.classList.add('pub-lock');byId('pubClose').focus();}
  document.addEventListener('xsus:open-publishing',open);
  byId('pubClose').addEventListener('click',close);byId('pubDone').addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  overlay.querySelectorAll('[data-pub-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.pubTab)));
  byId('pubReview').addEventListener('click',()=>tab('configuration'));
  const name=byId('pubProjectName'),env=byId('pubEnvironment'),sub=byId('pubSubdomain'),notes=byId('pubNotes'),output=byId('pubOutput'),url=byId('pubUrl');
  function normalized() {return sub.value.toLowerCase().trim().replace(/[^a-z0-9-]/g,'').replace(/^-+|-+$/g,'').slice(0,40)||'my-first-app';}
  function updateUrl(){url.textContent=normalized()+'.example.invalid';}
  sub.addEventListener('input',updateUrl);
  let previewVisible=false;
  function renderPreview(){updateUrl();output.replaceChildren();const lines=[`${t('Project:')} ${name.value.trim()||t('Untitled project')}`,`${t('Environment:')} ${t(env.options[env.selectedIndex].getAttribute('data-i18n') || env.options[env.selectedIndex].text)}`,`${t('Conceptual address:')} ${url.textContent}`,`${t('Release notes:')} ${notes.value.trim()||t('None')}`,t('This is a visual configuration preview. Nothing was saved or deployed.')];lines.forEach(line=>{const el=document.createElement('p');el.textContent=line;output.append(el);});}
  byId('pubPreview').addEventListener('click',()=>{previewVisible=true;renderPreview();});
  document.addEventListener('xsus:language-changed',()=>{if(previewVisible)renderPreview();});
  byId('pubReset').addEventListener('click',()=>{previewVisible=false;name.value='My First App';env.value='preview';sub.value='';notes.value='';updateUrl();output.textContent=t('Configuration reset locally. No deployment was affected.');});
  document.addEventListener('keydown',e=>{if(overlay.classList.contains('hidden'))return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const items=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(x=>x.getClientRects().length);if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
}
