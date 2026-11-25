import {mountWorkspaceView} from './workspace-view.mjs';
export function mountUnifiedView({document,container,app}={}){
 if(!document||!container||!app?.workspace)throw TypeError('Invalid view');
 const make=(tag,label)=>{const e=document.createElement(tag);if(label)e.textContent=label;return e};
 const root=make('section'),controls=make('div'),name=make('input'),prompt=make('textarea'),language=make('select'),projects=make('select'),status=make('p'),changes=make('pre'),editor=make('div');
 name.placeholder='Project name (required)';name.maxLength=120;prompt.placeholder='Describe your website';prompt.maxLength=12000;root.className='xsus-web-unified';status.setAttribute('role','status');
 for(const [e,label] of [[name,'Project name'],[prompt,'Website instructions'],[language,'Language'],[projects,'Existing project']])e.setAttribute('aria-label',label);
 for(const l of ['en','sq','fr']){const o=make('option',l);o.value=l;language.append(o)}
 const buttons={};for(const label of ['Generate','Refresh projects','Open project','Propose replacement','Accept proposal','Reject proposal','Download original']){const b=make('button',label);b.type='button';buttons[label]=b}
 controls.append(name,language,prompt,buttons.Generate,projects,buttons['Refresh projects'],buttons['Open project'],buttons['Propose replacement'],buttons['Accept proposal'],buttons['Reject proposal'],buttons['Download original']);
 root.append(controls,status,changes,editor);container.append(root);
 const view=mountWorkspaceView({document,container:editor,workspace:app.workspace});
 let busy=false,disposed=false;
 function render(){if(disposed)return;const s=app.workspace.snapshot();for(const b of Object.values(buttons))b.disabled=busy||s.busy;
 for(const k of ['Generate','Open project'])buttons[k].disabled||=s.dirty;
 for(const k of ['Propose replacement','Download original'])buttons[k].disabled||=!s.id;
 for(const k of ['Accept proposal','Reject proposal'])buttons[k].disabled||=!s.proposal;
 changes.textContent=s.proposal?s.proposal.changes.map(c=>c.operation+': '+c.path).join('\n'):'';
 }
 async function run(fn){if(busy||disposed)return;busy=true;render();status.textContent='Working…';try{await fn();if(!disposed)status.textContent='Ready'}catch(error){if(!disposed)status.textContent=({400:'Invalid project details.',401:'Please sign in again.',403:'Website origin not authorized.',409:'Project revision conflict.',429:'Service busy. Try again.',503:'Build service unavailable.'}[error?.status]||'Operation failed. Check project details and connection.')}finally{busy=false;render()}}
 const details=()=>({name:name.value,language:language.value||'en'});
 async function refresh(){const list=await app.list();if(disposed)return;projects.replaceChildren(...list.filter(p=>p.status==='completed').map(p=>{const o=make('option',p.id);o.value=p.id;return o}))}
 const on=(k,fn)=>buttons[k].addEventListener('click',()=>run(fn));
 on('Generate',async()=>{if(!name.value.trim()){status.textContent='Enter a project name.';name.focus();return Promise.reject({status:400})}if(!prompt.value.trim())return Promise.reject({status:400});await app.generate({...details(),prompt:prompt.value});await refresh()});
 on('Refresh projects',refresh);
 on('Open project',()=>app.open(projects.value,details()));
 on('Propose replacement',()=>app.workspace.prepare(prompt.value));
 on('Accept proposal',()=>app.workspace.accept(app.workspace.snapshot().proposal.baseRevision));
 on('Reject proposal',()=>app.workspace.reject());
 on('Download original',async()=>{const blob=await app.downloadOriginal();if(disposed)return;const url=URL.createObjectURL(blob);try{const a=make('a');a.href=url;a.download='website.zip';a.click()}finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}});
 const off=app.workspace.subscribe(render);render();
 return Object.freeze({refresh:()=>run(refresh),dispose(){disposed=true;off();view.dispose();root.remove()}});
}
