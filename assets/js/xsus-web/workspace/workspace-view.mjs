import {createBrowserPreview} from './browser-preview.mjs';
export function mountWorkspaceView({document,container,workspace}={}){
 if(!document||!container||!workspace)throw TypeError('Invalid workspace view');
 const make=(tag,label)=>{const e=document.createElement(tag);if(label)e.textContent=label;return e};
 const root=make('section');root.className='xsus-web-workspace';
 const toolbar=make('div'),files=make('select'),devices=make('select'),source=make('textarea'),status=make('p'),preview=make('div'),save=make('button','Save'),apply=make('button','Apply code'),refresh=make('button','Preview');
 files.setAttribute('aria-label','Source file');devices.setAttribute('aria-label','Preview device');source.setAttribute('aria-label','Source code');status.setAttribute('role','status');
 for(const d of ['desktop','tablet','mobile']){const o=make('option',d);o.value=d;devices.append(o)}
 for(const b of [save,apply,refresh])b.type='button';
 toolbar.append(files,devices,apply,save,refresh);root.append(toolbar,source,status,preview);container.append(root);
 let selected=null,view=null,disposed=false,localDirty=false,lastId=null,lastPreviewKey=null;
 function showPreview(s){if(!s.source||!selected)return;view?.dispose();view=createBrowserPreview({document,container:preview,files:s.source.files});view.resize(devices.value);if(selected.endsWith('.html'))view.select(selected);lastPreviewKey=JSON.stringify([s.id,s.source.revision,selected,devices.value]);}
 function render(s){if(disposed)return;const paths=Object.keys(s.source?.files??{});if(s.id!==lastId){localDirty=false;selected=null;lastId=s.id;view?.dispose();view=null}
 if(!paths.includes(selected))selected=paths.includes('index.html')?'index.html':paths[0]??null;
 files.replaceChildren(...paths.map(p=>{const o=make('option',p);o.value=p;return o}));files.value=selected??'';
 if(!localDirty)source.value=selected?s.source.files[selected]:'';
 source.disabled=files.disabled=!selected||s.busy;apply.disabled=!selected||s.busy||!localDirty;save.disabled=!s.dirty||s.busy||localDirty;refresh.disabled=!selected||s.busy||localDirty;
 status.textContent=s.busy?'Working…':localDirty?'Unapplied code':s.dirty?'Unsaved changes':'Ready';
 if(selected&&!s.busy&&!localDirty&&JSON.stringify([s.id,s.source.revision,selected,devices.value])!==lastPreviewKey){try{showPreview(s)}catch{status.textContent='Preview failed; try Preview again'}}
 }
 function action(fn){try{fn()}catch{status.textContent='Operation failed'}}
 source.addEventListener('input',()=>{localDirty=true;render(workspace.snapshot())});
 files.addEventListener('change',()=>{if(localDirty){files.value=selected;status.textContent='Apply code before switching';return}selected=files.value;render(workspace.snapshot())});
 apply.addEventListener('click',()=>action(()=>{const s=workspace.snapshot();workspace.edit('update',selected,source.value,s.source.revision);localDirty=false;render(workspace.snapshot())}));
 save.addEventListener('click',async()=>{try{await workspace.save()}catch{if(!disposed)status.textContent='Save failed'}});
 refresh.addEventListener('click',()=>action(()=>{showPreview(workspace.snapshot())}));
 devices.addEventListener('change',()=>action(()=>view?.resize(devices.value)));
 const off=workspace.subscribe(render);render(workspace.snapshot());
 return Object.freeze({dispose(){disposed=true;off();view?.dispose();root.remove()}});
}
