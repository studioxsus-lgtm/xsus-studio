import {studioText,localizeStudio} from './studio-language.mjs';
import {verifiedArchive} from './archive-export.mjs';
import {mountWorkspaceView} from './workspace-view.mjs?v=3';
export function mountUnifiedView({document,container,app,preferences}={}){
 if(!document||!container||!app?.workspace)throw TypeError('Invalid view');
 const t=key=>studioText(document,key);
 const make=(tag,label)=>{const e=document.createElement(tag);if(label)e.textContent=label;return e};
 const root=make('section'),name=make('input'),prompt=make('textarea'),language=make('select'),projects=make('select'),status=make('p'),changes=make('pre'),editor=make('div');
 name.dataset.hint='Project name (required)';name.maxLength=120;prompt.dataset.hint='Describe your website';prompt.maxLength=12000;root.className='xsus-web-unified';status.setAttribute('role','status');
 for(const [e,label] of [[name,'Project name'],[prompt,'Website instructions'],[language,'Language'],[projects,'Existing project']])e.dataset.labelKey=label;
 for(const l of ['en','sq','fr']){const o=make('option',l);o.value=l;language.append(o)}
 const buttons={};for(const label of ['Generate','Refresh projects','Open project','Propose replacement','Accept proposal','Reject proposal','Download current ZIP']){const b=make('button',label);b.type='button';b.dataset.copy=label;buttons[label]=b}
 const nav=make('nav'),projectPanel=make('section'),intelligence=make('section');
 const panes=[['Projects',projectPanel],['Intelligence',intelligence],['Workspace',editor]];
 root.classList.add('studio-v2');nav.className='studio-tabs';nav.dataset.labelKey='Studio panels';
 function selectPanel(active){for(const [label,panel] of panes){
   panel.dataset.active=String(active===label);
   nav.querySelector('[data-tab="'+label+'"]').setAttribute('aria-pressed',String(active===label));
 }}
 for(const [label,panel] of panes){
   panel.className='studio-panel';panel.dataset.labelKey=label;
   const heading=make('h2',label);heading.dataset.copy=label;panel.append(heading);
   const tab=make('button',label);tab.type='button';tab.dataset.copy=label;tab.dataset.tab=label;
   tab.addEventListener('click',()=>selectPanel(label));nav.append(tab);
 }
 projectPanel.append(projects,buttons['Open project'],buttons['Refresh projects']);
 intelligence.append(name,language,prompt,buttons.Generate,buttons['Propose replacement'],changes,buttons['Accept proposal'],buttons['Reject proposal']);
 editor.append(buttons['Download current ZIP']);
 root.append(nav,status,projectPanel,intelligence,editor);container.append(root);selectPanel('Intelligence');
 let draft=false;
 const view=mountWorkspaceView({document,container:editor,workspace:app.workspace,onDraftChange(value){draft=value;render()}});
 let busy=false,disposed=false;
 function render(){if(disposed)return;const s=app.workspace.snapshot();for(const b of Object.values(buttons))b.disabled=busy||s.busy||draft;
 for(const k of ['Generate','Open project'])buttons[k].disabled||=s.dirty;
 for(const k of ['Propose replacement','Download current ZIP'])buttons[k].disabled||=!s.id;
 for(const k of ['Accept proposal','Reject proposal'])buttons[k].disabled||=!s.proposal;
 for(const k of ['Accept proposal','Reject proposal'])buttons[k].hidden=!s.proposal;
 buttons['Open project'].disabled||=!projects.value;
 changes.textContent=s.proposal?s.proposal.changes.map(c=>c.operation+': '+c.path).join('\n'):'';
 }
 async function run(fn){if(busy||disposed)return;busy=true;view.setLocked(true);render();status.textContent=t('Working…');try{await fn();if(!disposed)status.textContent=t('Ready')}catch(error){if(!disposed)status.textContent=t({400:'Invalid project details.',401:'Please sign in again.',403:'Website origin not authorized.',409:'Project revision conflict.',429:'Service busy. Try again.',503:'Build service unavailable.'}[error?.status]||'Operation failed. Check project details and connection.')}finally{busy=false;if(!disposed)view.setLocked(false);render()}}
 const details=()=>({name:name.value,language:language.value||'en'});
 let catalog=new Map();
 async function refresh(){
   const list=await app.list();if(disposed)return;
   const stored=preferences?.read()??{};
   const previous=projects.value;
   catalog=new Map(list.filter(p=>p.status==='completed').map((p,index)=>{
     const known=stored.projects?.[p.id];
     return [p.id,{name:p.name||known?.name||('Website '+(index+1)),language:p.language||known?.language||'en'}];
   }));
   projects.replaceChildren(...Array.from(catalog,([id,item])=>{const o=make('option',item.name);o.value=id;return o}));
   for(const id of [app.workspace.snapshot().id,previous,stored.active]){
     if(catalog.has(id)){projects.value=id;break}
   }
 }
 const on=(k,fn)=>buttons[k].addEventListener('click',()=>run(fn));
 on('Generate',async()=>{if(!name.value.trim()){status.textContent='Enter a project name.';name.focus();return Promise.reject({status:400})}if(!prompt.value.trim())return Promise.reject({status:400});const info=details();const result=await app.generate({...info,prompt:prompt.value});if(disposed)return;preferences?.remember(result.id,info);selectPanel('Workspace');await refresh()});
 on('Refresh projects',refresh);
 on('Open project',async()=>{const id=projects.value,info=catalog.get(id);await app.open(id,info);if(disposed)return;preferences?.remember(id,info);name.value=info.name;language.value=info.language;selectPanel('Workspace')});
 on('Propose replacement',()=>app.workspace.prepare(prompt.value));
 on('Accept proposal',()=>app.workspace.accept(app.workspace.snapshot().proposal.baseRevision));
 on('Reject proposal',()=>app.workspace.reject());
 on('Download current ZIP',async()=>{const blob=await verifiedArchive(app.workspace.snapshot().source.files);if(disposed)return;const url=URL.createObjectURL(blob);try{const a=make('a');a.href=url;a.download='website.zip';a.click()}finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}});
 const languagePicker=document.getElementById('language');
 function translate(){localizeStudio(document,root);view.translate()}
 translate();languagePicker?.addEventListener('change',translate);
 const off=app.workspace.subscribe(render);render();
 return Object.freeze({refresh:()=>run(refresh),dispose(){disposed=true;languagePicker?.removeEventListener('change',translate);off();view.dispose();root.remove()}});
}

