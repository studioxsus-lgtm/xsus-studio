import {composePage,createDesignSystem} from './design.mjs';
import {createProject} from './index.mjs';
export function createVisualEditor({name,pages,design={},language='en'},{historyLimit=30}={}){
 if(!Number.isInteger(historyLimit)||historyLimit<2||historyLimit>100)throw new TypeError('Invalid history limit');
 if(!Array.isArray(pages))throw new TypeError('Invalid pages');
 createProject({name,pages:pages.map(p=>p.path)});
 function validate(state){createDesignSystem(state.design);for(const p of state.pages)composePage({title:p.title,sections:p.sections,language,design:state.design});return structuredClone(state)}
 let current=validate({pages,design}),past=[],future=[],revision=0;
 const snapshot=()=>({revision,...structuredClone(current),canUndo:past.length>0,canRedo:future.length>0});
 function commit(expected,change){if(expected!==revision)throw new Error('Revision conflict');const next=structuredClone(current);change(next);const checked=validate(next);past.push(current);if(past.length>historyLimit)past.shift();current=checked;future=[];revision++;return snapshot()}
 function page(state,path){const p=state.pages.find(p=>p.path===path);if(!p)throw new Error('Page not found');return p}
 function index(p,i){if(!Number.isInteger(i)||i<0||i>=p.sections.length)throw new RangeError('Invalid section index')}
 return Object.freeze({snapshot,
 setDesign(design,expected){return commit(expected,s=>{s.design=design})},
 addSection(path,section,expected){return commit(expected,s=>page(s,path).sections.push(section))},
 editSection(path,i,section,expected){return commit(expected,s=>{const p=page(s,path);index(p,i);p.sections[i]=section})},
 removeSection(path,i,expected){return commit(expected,s=>{const p=page(s,path);index(p,i);p.sections.splice(i,1)})},
 moveSection(path,from,to,expected){return commit(expected,s=>{const p=page(s,path);index(p,from);index(p,to);p.sections.splice(to,0,p.sections.splice(from,1)[0])})},
 undo(expected){if(expected!==revision)throw new Error('Revision conflict');if(!past.length)throw new Error('No undo');future.push(current);current=past.pop();revision++;return snapshot()},
 redo(expected){if(expected!==revision)throw new Error('Revision conflict');if(!future.length)throw new Error('No redo');past.push(current);current=future.pop();revision++;return snapshot()},
 preview(path){const p=page(current,path);const result=composePage({title:p.title,sections:p.sections,language,design:current.design});const prefix='../'.repeat(path.split('/').length-1);return {...result,html:result.html.replace('href="design.css"','href="'+prefix+'design.css"'),revision,executable:false}},
 export(){const files=Object.create(null);for(const p of current.pages){const result=this.preview(p.path);files[p.path]=result.html;files['design.css']=result.css}return {files,revision,reviewRequired:true,publicationAuthorized:false}}
 });
}
