import { t } from './i18n/language-manager.js';
// XSUS App visual editor: in-memory design mockup only. No code is generated or persisted.
const catalog = [
  {type:'heading',name:'Heading',icon:'heading'},
  {type:'paragraph',name:'Paragraph',icon:'align-left'},
  {type:'button',name:'Button',icon:'mouse-pointer-click'},
  {type:'card',name:'Card',icon:'square'},
  {type:'input',name:'Input',icon:'text-cursor-input'},
  {type:'badge',name:'Badge',icon:'tag'}
];
let layers = [
  {id:1,type:'heading',label:'Welcome to My App',radius:10},
  {id:2,type:'paragraph',label:'A beautiful starting point for your next application.',radius:10},
  {id:3,type:'button',label:'Explore Now',radius:10},
  {id:4,type:'card',label:'Featured content',radius:10}
];
let selectedId=1, nextId=5, activeTab='components', showOutline=true;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui=s=>esc(t(s));
const ic=n=>`<i data-lucide="${n}"></i>`;
const selected=()=>layers.find(x=>x.id===selectedId);
function previewLayer(item){
  const chosen=item.id===selectedId;
  const klass=`visual-node visual-${item.type} ${chosen?'is-selected':''} ${showOutline?'show-outline':''}`;
  const content=item.type==='heading'?`<h3>${esc(item.id<=4?t(item.label):item.label)}</h3>`:item.type==='paragraph'?`<p>${esc(item.id<=4?t(item.label):item.label)}</p>`:item.type==='button'?`<span class="visual-button-label">${esc(item.id<=4?t(item.label):item.label)}</span>`:item.type==='input'?`<span class="visual-input-label">${esc(item.id<=4?t(item.label):item.label)}</span>`:item.type==='badge'?`<span class="visual-badge-label">${esc(item.id<=4?t(item.label):item.label)}</span>`:`<div class="visual-card-icon">${ic('layout-template')}</div><strong>${esc(item.id<=4?t(item.label):item.label)}</strong><small>${ui('Sample card content')}</small>`;
  return `<button type="button" class="${klass}" style="border-radius:${item.radius}px" data-visual-select="${item.id}" ${chosen?'data-visual-selected=""':''} aria-pressed="${chosen}">${content}</button>`;
}
export function renderVisualDesign(){
  const item=selected();
  return `<div class="visual-workbench" aria-label="${ui('Visual editor demonstration')}">
    <aside class="visual-library"><div class="visual-pane-title">${ic('blocks')} ${ui('Components')}</div><div class="visual-tabs"><button data-visual-action="components" class="${activeTab==='components'?'active':''}">${ui('Library')}</button><button data-visual-action="layers" class="${activeTab==='layers'?'active':''}">${ui('Layers')}</button></div>
    ${activeTab==='components'?`<div class="visual-catalog">${catalog.map(x=>`<button data-visual-add="${x.type}" type="button">${ic(x.icon)}<span>${ui(x.name)}</span>${ic('plus')}</button>`).join('')}</div>`:`<div class="visual-layer-list">${layers.map((x,i)=>`<button type="button" data-visual-select="${x.id}" class="${x.id===selectedId?'active':''}"><span>${i+1}.</span>${ic(catalog.find(c=>c.type===x.type)?.icon||'box')}<span>${esc(x.label)}</span></button>`).join('')}</div>`}
    <p class="visual-help">${ui('Add components or select a layer. Changes are temporary UI samples.')}</p></aside>
    <section class="visual-stage"><div class="visual-stage-bar"><span>${ic('mouse-pointer-2')} ${ui('Canvas · Demo')}</span><button type="button" data-visual-action="outline" aria-pressed="${showOutline}">${ic('scan')} ${ui('Outlines')} ${ui(showOutline?'On':'Off')}</button></div><div class="visual-stage-scroll"><div class="visual-artboard"><div class="visual-artboard-header"><strong>${ui('My App')}</strong><span>${ui('Home · Explore')}</span></div><div class="visual-artboard-content">${layers.map(previewLayer).join('')}</div></div></div><div class="visual-stage-foot">${layers.length} ${ui('components · Select to edit properties')}</div></section>
    <aside class="visual-inspector"><div class="visual-pane-title">${ic('sliders-horizontal')} ${ui('Properties')}</div>${item?`<div class="visual-inspector-selection"><span>${ui('Selected layer')}</span><strong>${ui(item.type)} #${item.id}</strong></div><label for="visual-label">${ui('Content')}</label><input id="visual-label" data-visual-input="label" value="${esc(item.label)}" maxlength="100"/><label for="visual-radius">${ui('Corner radius')} <span>${item.radius}px</span></label><input id="visual-radius" data-visual-range="radius" type="range" min="0" max="32" value="${item.radius}"/><div class="visual-actions"><button data-visual-action="up" ${layers[0]?.id===item.id?'disabled':''}>${ic('arrow-up')} Up</button><button data-visual-action="down" ${layers[layers.length-1]?.id===item.id?'disabled':''}>${ic('arrow-down')} Down</button><button data-visual-action="duplicate">${ic('copy')} Duplicate</button><button data-visual-action="delete">${ic('trash-2')} Delete</button></div>`:`<p class="visual-help">${ui('Select a component to edit it.')}</p>`}<div class="visual-disclaimer">${ic('shield-check')} ${ui('Design-only · No source code changes')}</div></aside>
  </div>`;
}
export function handleVisualDesignClick(event){
  const add=event.target.closest('[data-visual-add]');
  if(add){const type=add.dataset.visualAdd;const entry=catalog.find(c=>c.type===type);if(!entry)return;const x={id:nextId++,type,label:type==='heading'?t('New heading'):type==='paragraph'?t('Your paragraph text'):type==='button'?t('Click here'):type==='input'?t('Enter text'):type==='badge'?t('New badge'):t('New card'),radius:10};layers.push(x);selectedId=x.id;return;}
  const sel=event.target.closest('[data-visual-select]');if(sel){selectedId=Number(sel.dataset.visualSelect);return;}
  const action=event.target.closest('[data-visual-action]')?.dataset.visualAction;if(!action)return;
  if(action==='components'||action==='layers'){activeTab=action;return;}
  if(action==='outline'){showOutline=!showOutline;return;}
  const idx=layers.findIndex(x=>x.id===selectedId);if(idx<0)return;
  if(action==='delete'){layers.splice(idx,1);selectedId=layers[Math.min(idx,layers.length-1)]?.id??null;}
  if(action==='duplicate'){const copy={...layers[idx],id:nextId++};layers.splice(idx+1,0,copy);selectedId=copy.id;}
  if(action==='up'&&idx>0)[layers[idx-1],layers[idx]]=[layers[idx],layers[idx-1]];
  if(action==='down'&&idx<layers.length-1)[layers[idx],layers[idx+1]]=[layers[idx+1],layers[idx]];
}
export function handleVisualDesignInput(event){
  const item=selected();if(!item)return;
  if(event.target.dataset.visualInput==='label')item.label=event.target.value.slice(0,100);
  if(event.target.dataset.visualRange==='radius')item.radius=Math.max(0,Math.min(32,Number(event.target.value)||0));
}
