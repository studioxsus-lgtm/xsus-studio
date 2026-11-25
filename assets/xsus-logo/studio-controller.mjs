import {mountStudioView} from './studio-view.mjs?v=20261125-7';
import {createWorkspace} from './workspace.mjs?v=20261125-6';
import {mountVector,renderVector} from './vector-canvas.mjs';
import {applyLanguage,translate} from './i18n.mjs?v=20261125-8';
export function mountStudio(root,supabase){
 const dom=root.ownerDocument,{get}=mountStudioView(root);
 root.setAttribute('data-build','20261125-7');const build=dom.createElement('small');build.textContent='Build 20261125-7';root.append(build);
 const language=dom.getElementById('language-select');
 const compact=dom.defaultView.matchMedia('(max-width:700px)');
 const fitProjects=()=>{get('projects').open=!compact.matches};
 fitProjects();
 compact.addEventListener('change',fitProjects);
 let lang=language?.value||'en',workspace,notice='',lastProject=null;
 const t=k=>translate(lang,k);
 const status=k=>{notice=k;get('status').textContent=t(k)+(['ready','saved','exported','generating'].includes(k)?'':' ['+(/^[a-zA-Z0-9_]{1,80}$/.test(k)?k:'UI_ERROR')+']')};
 const button=(label,fn)=>{const b=dom.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>run(fn));return b};
 const run=async fn=>{try{await fn()}catch(e){status(e.message||'generation_failed')}};
 const discard=()=>{if(workspace.state().dirty){if(!dom.defaultView.confirm(t('unsaved')))return false;workspace.discard()}return true};
 const refresh=async()=>{const rows=await workspace.list();get('project-list').replaceChildren(...rows.map(row=>button(row.name,async()=>{if(!workspace.state().busy&&discard())await workspace.open(row.id)})))};
 function render(s){
 const e=s.editor,l=e?.document.layers.find(x=>x.id===e.selected),busy=s.busy;
 if((s.project?.id??null)!==lastProject){lastProject=s.project?.id??null;get('name').value=s.project?.name??''}
 for(const id of ['new','generate','prompt','name'])get(id).disabled=busy;
 get('cancel').disabled=s.assistant.status!=='generating';
 for(const id of ['save','add','format','export'])get(id).disabled=busy||!e;
 get('delete').disabled=busy||!s.project;
 get('undo').disabled=busy||!e?.canUndo;get('redo').disabled=busy||!e?.canRedo;
 for(const id of ['duplicate','remove-layer','apply','fill'])get(id).disabled=busy||!l;
 for(const id of ['text','font-size'])get(id).disabled=busy||l?.type!=='text';
 const index=e?.document.layers.findIndex(x=>x.id===e.selected)??-1;
 get('up').disabled=busy||index<0||index===e.document.layers.length-1;
 get('down').disabled=busy||index<=0;
 if(l){get('fill').value=l.fill;if(l.type==='text'){get('text').value=l.text;get('font-size').value=l.fontSize}}
 if(e){const svg=mountVector(get('canvas'),e.document);svg.addEventListener('click',event=>{const id=event.target.getAttribute('data-layer-id');if(id&&!busy)run(()=>{workspace.edit('select',id);get(event.target.localName==='text'?'text':'fill').focus()})})}else get('canvas').textContent=t('empty');
 get('layers').replaceChildren(...(e?.document.layers??[]).map((layer,i)=>{const name=layer.type==='text'?(layer.id==='brand-name'?t('brandName'):t('text'))+' · '+layer.text:t('symbol')+' '+(i+1);const b=button(name,()=>workspace.edit('select',layer.id));b.disabled=busy;b.setAttribute('aria-pressed',String(layer.id===e.selected));return b}));
 get('variants').replaceChildren(...s.assistant.variants.map((v,i)=>{const b=button(String(i+1),()=>{if(i===s.assistant.selected)return;const dirty=workspace.state().dirty;if(dirty&&!dom.defaultView.confirm(t('unsaved')))return;workspace.variant(i,{discardChanges:dirty})});b.disabled=busy;b.setAttribute('aria-pressed',String(i===s.assistant.selected));b.append(renderVector(v.document,dom));return b}));
 if(s.assistant.status==='generating')status('generating');else if(s.assistant.status==='error')status(s.assistant.error);else if(s.assistant.status==='review_required')status(s.assistant.reasons.includes('missing_brand_name')?'missing_brand_name':'review_required');else if(notice==='generating'||!notice)status('ready');
 }
 workspace=createWorkspace({supabase,dom,onChange:render});
 const bind=(id,fn)=>get(id).addEventListener('click',()=>run(fn));
 const selected=()=>workspace.state().editor.selected;
 bind('new',()=>{if(discard())workspace.newProject()});
 bind('generate',()=>{if(discard())return workspace.generate({prompt:get('prompt').value,language:lang})});
 bind('cancel',()=>workspace.cancel());
 bind('save',async()=>{await workspace.save(get('name').value);status('saved');await refresh()});
 bind('delete',async()=>{if(dom.defaultView.confirm(t('confirmDelete'))){await workspace.remove();await refresh()}});
 for(const op of ['undo','redo'])bind(op,()=>workspace.edit(op));
 bind('add',()=>workspace.edit('add',{id:crypto.randomUUID(),type:'circle',cx:256,cy:256,r:64,fill:'#db2777'}));
 bind('duplicate',()=>workspace.edit('duplicate',selected(),crypto.randomUUID()));
 bind('remove-layer',()=>workspace.edit('remove',selected()));
 for(const [id,delta] of [['up',1],['down',-1]])bind(id,()=>{const e=workspace.state().editor;workspace.edit('reorder',e.selected,e.document.layers.findIndex(l=>l.id===e.selected)+delta)});
 bind('apply',()=>{const e=workspace.state().editor,l=e.document.layers.find(x=>x.id===e.selected);workspace.edit('edit',l.id,{fill:get('fill').value,...(l.type==='text'?{text:get('text').value,fontSize:Number(get('font-size').value)}:{})})});
 bind('export',async()=>{await workspace.export({name:get('name').value,format:get('format').value});status('exported')});
 for(const key of ['white','dark','transparent'])bind(key,()=>{
  get('canvas').dataset.background=key;
  for(const option of ['white','dark','transparent'])get(option).setAttribute('aria-pressed',String(option===key));
 });
 language?.addEventListener('change',()=>{lang=applyLanguage(root,language.value);dom.documentElement.lang=lang;render(workspace.state())});
 applyLanguage(root,lang);render(workspace.state());run(refresh);
 return workspace;
}
