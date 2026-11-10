import { t } from './i18n/language-manager.js';
// XSUS App V2.9 — UI-only sample diagnostics. No actual test execution.
const $ = (selector) => document.querySelector(selector);
const checks = [
  ['Header navigation','passed','UI','Navigation links are visible in the mock workspace.'],
  ['Sidebar active state','passed','UI','Active section indicator is present.'],
  ['AI composer layout','passed','UI','Composer controls are represented visually.'],
  ['Project card display','passed','UI','Sample cards have a responsive grid.'],
  ['Desktop preview frame','passed','Preview','Desktop viewport mock is available.'],
  ['Tablet preview frame','passed','Preview','Tablet viewport mock is available.'],
  ['Mobile preview frame','passed','Preview','Mobile viewport mock is available.'],
  ['Code tab display','passed','Editor','Code view can be selected in the prototype.'],
  ['Version timeline display','passed','History','Sample version entries are shown.'],
  ['Real AI generation','failed','Integration','No AI adapter is connected.'],
  ['Cloud project persistence','failed','Storage','No persistence service is connected.'],
  ['Deployment pipeline','skipped','Deployment','Not included in this design-only phase.']
].map(([name,status,category,detail],index)=>({id:index+1,name,status,category,detail}));
let selected=1, tab='overview', lastFocus=null, progressTimer=null;
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
  const term=$('#tdSearch').value.trim().toLowerCase(), filter=$('#tdFilter').value;
  const visible=checks.filter(x=>(filter==='all'||x.status===filter)&&([x.name,t(x.name),x.category,t(x.category),x.status,t(x.status)].some(label=>label.toLowerCase().includes(term))));
  if(!visible.some(x=>x.id===selected)) selected=visible[0]?.id ?? null;
  $('#tdList').innerHTML=visible.map(x=>`<button type="button" class="td-item ${x.id===selected?'active':''}" data-td-id="${x.id}" aria-pressed="${x.id===selected}"><span>${escapeHtml(t(x.name))}</span><b class="td-status ${x.status}">${t(x.status)}</b></button>`).join('');
  $('#tdEmpty').classList.toggle('hidden',visible.length!==0);
  const item=checks.find(x=>x.id===selected);
  $('#tdDetails').innerHTML=item?`<h3>${escapeHtml(t(item.name))}</h3><p>${escapeHtml(t('Category:'))} ${escapeHtml(t(item.category))} · ${escapeHtml(t('Sample status:'))} <strong class="td-status ${item.status}">${escapeHtml(t(item.status))}</strong></p><p>${escapeHtml(t(item.detail))}</p><code>${escapeHtml(t('DEMO ONLY — this status is illustrative, not a real test result.'))}</code>`:`<p>${escapeHtml(t('Select a sample check to see details.'))}</p>`;
  $('#tdSummary').style.display=tab==='diagnostics'?'none':'grid';
  $('#tdList').setAttribute('aria-label',tab==='diagnostics'?t('Sample diagnostic records'):t('Sample test cases'));
}
document.addEventListener('xsus:language-changed',()=>{if(document.getElementById('tdList'))render();});
function close(){const modal=$('#tdOverlay');modal.classList.add('hidden');document.body.style.overflow='';if(progressTimer){clearInterval(progressTimer);progressTimer=null;}$('#tdProgress').classList.add('hidden');lastFocus?.focus?.();}
function open(){lastFocus=document.activeElement;$('#tdOverlay').classList.remove('hidden');document.body.style.overflow='hidden';render();$('#tdClose').focus();}
export function initTestingDiagnostics(){
  document.addEventListener('xsus:open-testing',open);
  $('#tdClose').addEventListener('click',close);$('#tdDone').addEventListener('click',close);
  $('#tdOverlay').addEventListener('click',e=>{if(e.target===$('#tdOverlay'))close();});
  document.addEventListener('keydown',e=>{if($('#tdOverlay').classList.contains('hidden'))return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const controls=[...$('#tdOverlay').querySelectorAll('button:not([disabled]),input,select')].filter(x=>x.getClientRects().length);if(!controls.length){e.preventDefault();$('#tdClose').focus();return;}const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  $('#tdSearch').addEventListener('input',render);$('#tdFilter').addEventListener('change',render);
  $('#tdList').addEventListener('click',e=>{const btn=e.target.closest('[data-td-id]');if(btn){selected=Number(btn.dataset.tdId);render();}});
  document.querySelectorAll('[data-td-tab]').forEach(btn=>btn.addEventListener('click',()=>{tab=btn.dataset.tdTab;document.querySelectorAll('[data-td-tab]').forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});render();}));
  $('#tdSimulate').addEventListener('click',()=>{if(progressTimer)return;const button=$('#tdSimulate');button.disabled=true;let percent=0;$('#tdProgress').classList.remove('hidden');$('#tdProgressValue').textContent='0%';progressTimer=setInterval(()=>{percent=Math.min(100,percent+20);$('#tdProgressValue').textContent=`${percent}%`;if(percent===100){clearInterval(progressTimer);progressTimer=null;button.disabled=false;$('#tdProgress').textContent=t('Visual simulation complete. No real tests were executed.');}},180);});
}
