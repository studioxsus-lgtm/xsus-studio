import {studioText,localizeStudio} from './studio-language.mjs';
import {createBrowserPreview} from './browser-preview.mjs';
export function mountWorkspaceView({document,container,workspace,onDraftChange=()=>{}}={}){
 if(!document||!container||!workspace)throw TypeError('Invalid workspace view');
 const t=key=>studioText(document,key);
 const make=(tag,label)=>{const e=document.createElement(tag);if(label)e.textContent=label;return e};
 const root=make('section');root.className='xsus-web-workspace';
 const toolbar=make('div'),files=make('select'),devices=make('select'),source=make('textarea'),status=make('p'),preview=make('div'),save=make('button','Save'),refresh=make('button','Preview');
 files.dataset.labelKey='Source file';devices.dataset.labelKey='Preview device';source.dataset.labelKey='Source code';status.setAttribute('role','status');
 for(const d of ['desktop','tablet','mobile']){const o=make('option',d);o.dataset.copy=d;o.value=d;devices.append(o)}
 for(const b of [save,refresh])b.type='button';
 save.dataset.copy='Save';refresh.dataset.copy='Preview';
 toolbar.append(files,devices,save,refresh);root.append(toolbar,source,status,preview);container.append(root);
 let selected=null,view=null,disposed=false,localDirty=false,lastId=null,lastPreviewKey=null;
 const win=document.defaultView;
 let timer=null,locked=false,saving=false,failure='';
 function cancelTimer(){clearTimeout(timer);timer=null}
 function schedule(){
   cancelTimer();
   if(!disposed&&!locked&&!saving&&!failure&&win.navigator.onLine)
     timer=setTimeout(persist,1500);
 }
 function guardUnload(event){
   if(localDirty||workspace.snapshot().dirty){event.preventDefault();event.returnValue=''}
 }
 function offline(){cancelTimer();render(workspace.snapshot())}
 function online(){render(workspace.snapshot());if(localDirty||workspace.snapshot().dirty)schedule()}
 win.addEventListener('beforeunload',guardUnload);
 win.addEventListener('online',online);
 win.addEventListener('offline',offline);
 function showPreview(s){if(!s.source||!selected)return;view?.dispose();view=createBrowserPreview({document,container:preview,files:s.source.files});view.resize(devices.value);if(selected.endsWith('.html'))view.select(selected);lastPreviewKey=JSON.stringify([s.id,s.source.revision,selected,devices.value]);}
 function render(s){if(disposed)return;const paths=Object.keys(s.source?.files??{});if(s.id!==lastId){failure='';lastPreviewKey=null;localDirty=false;selected=null;lastId=s.id;view?.dispose();view=null}
 if(!paths.includes(selected))selected=paths.includes('index.html')?'index.html':paths[0]??null;
 files.replaceChildren(...paths.map(p=>{const o=make('option',p);o.value=p;return o}));files.value=selected??'';
 if(!localDirty)source.value=selected?s.source.files[selected]:'';
 const blocked=locked||s.busy||saving;
 source.disabled=files.disabled=!selected||blocked;
 save.disabled=blocked||(!localDirty&&!s.dirty)||!win.navigator.onLine;
 refresh.disabled=!selected||blocked||localDirty;
 status.textContent=!win.navigator.onLine?t('Offline'):saving?t('Saving…'):failure||(
   s.busy?t('Working…'):localDirty||s.dirty?t('Unsaved changes'):s.revision?t('Saved · Version')+' '+s.revision:'');
 if(selected&&!s.busy&&!localDirty&&JSON.stringify([s.id,s.source.revision,selected,devices.value])!==lastPreviewKey){try{showPreview(s)}catch{status.textContent=t('Preview unavailable')}}
 }
 function action(fn){try{fn()}catch{status.textContent='Operation failed'}}
 source.addEventListener('input',()=>{localDirty=true;failure='';onDraftChange(true);render(workspace.snapshot());schedule()});
 files.addEventListener('change',()=>{if(localDirty){files.value=selected;status.textContent=t('Save changes before switching files');return}selected=files.value;render(workspace.snapshot())});
 async function persist(){
   cancelTimer();
   if(disposed||locked||saving||workspace.snapshot().busy||!win.navigator.onLine)return;
   saving=true;failure='';
   try{
     const current=workspace.snapshot();
     if(localDirty){
       workspace.edit('update',selected,source.value,current.source.revision);
       localDirty=false;onDraftChange(false);
     }
     if(workspace.snapshot().dirty)await workspace.save();
   }catch(error){
     failure=error?.status===409?t('Revision conflict · Your changes are still open'):
       t('Save failed')+' · '+t({401:'Sign in again',413:'Project too large',507:'Storage quota exceeded'}[error?.status]??'Check the connection and retry');
   }finally{saving=false;if(!disposed)render(workspace.snapshot())}
 }
 save.addEventListener('click',persist);
 refresh.addEventListener('click',()=>action(()=>{showPreview(workspace.snapshot())}));
 devices.addEventListener('change',()=>action(()=>view?.resize(devices.value)));
 let previousDirty=false;
 const off=workspace.subscribe(s=>{
   const becameDirty=s.dirty&&!previousDirty;
   previousDirty=s.dirty;
   render(s);
   if(becameDirty&&!s.busy)schedule();
 });render(workspace.snapshot());
 return Object.freeze({translate(){localizeStudio(document,root);render(workspace.snapshot())},setLocked(value){locked=value;if(value)cancelTimer();else if(localDirty||workspace.snapshot().dirty)schedule();render(workspace.snapshot())},dispose(){disposed=true;cancelTimer();win.removeEventListener('beforeunload',guardUnload);win.removeEventListener('online',online);win.removeEventListener('offline',offline);off();view?.dispose();root.remove()}});
}

