import { t } from './i18n/language-manager.js';
// XSUS App V2.7 — in-memory UI demo, no backend or persistence.
import { $, refreshIcons } from './state.js';
import { toast } from './notifications.js';
const templates = [
  {id:'tpl-booking',name:'Booking Studio',type:'web',description:'Appointment booking, calendar and customer dashboard.',prompt:'Create a booking app with appointments, services and customer management.'},
  {id:'tpl-tasks',name:'Task Flow',type:'mobile',description:'Team tasks, deadlines and progress boards.',prompt:'Create a mobile task manager with team projects and deadlines.'},
  {id:'tpl-commerce',name:'Commerce Hub',type:'business',description:'Storefront, products and checkout flow.',prompt:'Create an online store with catalog, cart and checkout.'},
  {id:'tpl-fitness',name:'Fitness Tracker',type:'mobile',description:'Workouts, progress and wellness dashboard.',prompt:'Create a fitness tracker with workouts and progress charts.'},
  {id:'tpl-portfolio',name:'Portfolio',type:'web',description:'Personal portfolio with case studies.',prompt:'Create a responsive portfolio website with projects and contact page.'},
  {id:'tpl-crm',name:'Client Manager',type:'business',description:'Client records and activity dashboard.',prompt:'Create a client management app with contacts and activity history.'}
];
const projects=templates.slice(0,3).map((x,i)=>({...x,id:'sample-'+i,kind:'sample'}));
let view='projects', nextId=1, lastFocus=null;
const iconByType={web:'monitor',mobile:'smartphone',business:'briefcase-business'};
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
  const q=$('#pmSearch').value.trim().toLowerCase(),category=$('#pmCategory').value;
  const items=(view==='projects'?projects:templates).filter(x=>(category==='all'||x.type===category)&&(`${x.name} ${x.description}`).toLowerCase().includes(q));
  items.sort((a,b)=>$('#pmSort').value==='recent' ? (projects.indexOf(b)-projects.indexOf(a)) : a.name.localeCompare(b.name));
  $('#pmGrid').innerHTML=items.map(x=>`<article class="pm-card" data-type="${x.type}"><div class="pm-card-art"><i data-lucide="${iconByType[x.type]}"></i></div><div class="pm-card-body"><div class="pm-card-head"><h3>${escapeHtml(t(x.name))}</h3><span class="pm-chip">${x.type}</span></div><p>${escapeHtml(t(x.description))}</p><div class="pm-card-actions"><button type="button" data-pm-open="${escapeHtml(x.id)}">${t(view==='templates'?'Use template':'Open concept')} →</button>${view==='projects'&&x.kind==='local'?`<button type="button" class="pm-delete" data-pm-delete="${escapeHtml(x.id)}">${t('Remove')}</button>`:''}</div></div></article>`).join('');
  $('#pmEmpty').classList.toggle('hidden',items.length>0);$('#pmCount').textContent=`${items.length} ${t('visible')} · ${t(view)}`;
  refreshIcons();
}
document.addEventListener('xsus:language-changed',()=>{if(document.getElementById('pmGrid'))render();});
function close(){ $('#pmOverlay').classList.add('hidden');document.body.style.overflow='';lastFocus?.focus(); }
function open(){lastFocus=document.activeElement;$('#pmOverlay').classList.remove('hidden');document.body.style.overflow='hidden';$('#pmClose').focus();render();}
export function initProjectManager(){
  $('#openProjectManager').addEventListener('click',open);
  $('#pmClose').addEventListener('click',close);
  $('#pmOverlay').addEventListener('mousedown',e=>{if(e.target===$('#pmOverlay'))close();});
  document.addEventListener('keydown',e=>{if(!$('#pmOverlay').classList.contains('hidden')&&e.key==='Escape')close();});
  $('#pmOverlay').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const nodes=[...$('#pmOverlay').querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(n=>n.offsetParent!==null);if(!nodes.length){e.preventDefault();$('#pmClose').focus();return;}const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
  document.querySelectorAll('[data-pm-tab]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.pmTab;document.querySelectorAll('[data-pm-tab]').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-selected',String(t===b));});$('#pmForm').classList.add('hidden');render();}));
  ['pmSearch','pmCategory','pmSort'].forEach(id=>$('#'+id).addEventListener(id==='pmSearch'?'input':'change',render));
  $('#pmNew').addEventListener('click',()=>{$('#pmForm').classList.remove('hidden');$('#pmName').focus();});
  $('#pmCancel').addEventListener('click',()=>$('#pmForm').classList.add('hidden'));
  $('#pmSubmit').addEventListener('click',()=>{const name=$('#pmName').value.trim(),description=$('#pmDescription').value.trim();if(!name){$('#pmName').focus();toast(t('Enter a project name.'));return;}projects.unshift({id:'local-'+nextId++,name,type:$('#pmType').value,description:description||t('New local concept.'),prompt:description||`Create ${name}`,kind:'local'});$('#pmName').value='';$('#pmDescription').value='';$('#pmForm').classList.add('hidden');view='projects';document.querySelector('[data-pm-tab="projects"]').click();$('#pmSearch').value='';$('#pmCategory').value='all';render();toast(t('Local concept added for this page session only.'));});
  $('#pmGrid').addEventListener('click',e=>{const del=e.target.closest('[data-pm-delete]');if(del){const i=projects.findIndex(x=>x.id===del.dataset.pmDelete);if(i>=0)projects.splice(i,1);render();toast(t('Local concept removed.'));return;}const btn=e.target.closest('[data-pm-open]');if(!btn)return;const x=[...projects,...templates].find(x=>x.id===btn.dataset.pmOpen);if(!x)return;$('#prompt').value=x.prompt;$('#prompt').dispatchEvent(new Event('input',{bubbles:true}));close();document.querySelector('[data-section="AI Builder"]').click();$('#prompt').focus();toast(t('Concept loaded in AI Builder — demo only.'));});
}
