import {createProject} from './index.mjs';
const escape = s => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function generateDraft(input) {
 const project=createProject(input);
 const files=Object.fromEntries(project.pages.map(({path})=>{
  const root='../'.repeat(path.split('/').length-1);
  const nav=project.pages.map(p=>'<a href="'+root+p.path+'">'+escape(p.path.replace(/\.html$/,'').replaceAll('/',' / '))+'</a>').join(' ');
  return [path,'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+escape(project.name)+'</title><link rel="stylesheet" href="'+root+'assets/style.css"></head><body><header><nav aria-label="Main navigation">'+nav+'</nav></header><main><h1>'+escape(project.name)+'</h1><p>'+escape(path)+'</p></main></body></html>'];
 }));
 files['assets/style.css']='*{box-sizing:border-box}body{margin:0;font:1rem system-ui;color:#172033;background:#f8fafc}header,main{padding:clamp(1rem,4vw,3rem)}nav{display:flex;flex-wrap:wrap;gap:1rem}a{color:#4338ca}main{max-width:75rem;margin:auto}';
 return {project,files};
}
export function createWorkspace(input,{maxRevisions=20}={}) {
 if(!Number.isInteger(maxRevisions)||maxRevisions<1||maxRevisions>100) throw new TypeError('Invalid revision limit');
 const initial=generateDraft(input);
 let sequence=1;
 let history=[{revision:sequence,...initial}];
 const snapshot=()=>structuredClone(history.at(-1));
 function commit(files){
  history.push({revision:++sequence,project:initial.project,files});
  if(history.length>maxRevisions) history.shift();
  return snapshot();
 }
 return Object.freeze({snapshot, revisions:()=>history.map(x=>x.revision),
  update(path,content,expectedRevision){
   const current=history.at(-1);
   if(expectedRevision!==current.revision) throw new Error('Revision conflict');
   if(!Object.hasOwn(current.files,path)) throw new Error('Unknown file');
   if(typeof content!=='string'||content.length>250000) throw new TypeError('Invalid content');
   return commit({...current.files,[path]:content});
  },
  restore(revision,expectedRevision){
   if(expectedRevision!==history.at(-1).revision) throw new Error('Revision conflict');
   const target=history.find(x=>x.revision===revision);
   if(!target) throw new Error('Unknown revision');
   return commit({...target.files});
  }
 });
}
