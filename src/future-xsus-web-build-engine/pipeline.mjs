import {createVisualEditor} from './editor.mjs';
import {renderComponent,componentCss} from './components.mjs';
import {validateProject} from './quality.mjs';
import {createHash} from 'node:crypto';
import {posix} from 'node:path';
export function generateUnifiedProject({name,pages,design={},language='en'}){
 const editor=createVisualEditor({name,pages,design,language});
 const {files,revision}=editor.export();
 for(const page of pages){
 const links=pages.map(p=>({href:posix.relative(posix.dirname(page.path),p.path),label:p.title,current:p.path===page.path}));
 const header=renderComponent('header',{brand:name,links});
 const footer=renderComponent('footer',{text:name});
 const components=page.components??[];
 if(!Array.isArray(components)||components.length>30)throw new TypeError('Invalid components');
 const extra=components.map(c=>{if(!['metrics','chart','form','products'].includes(c.kind))throw new TypeError('Unsupported page component');return renderComponent(c.kind,c.props)}).join('');
 files[page.path]=files[page.path].replace('<body>','<body>'+header).replace('</main>',extra+'</main>').replace('</body>',footer+'</body>');
 }
 files['design.css']+=componentCss;
 const validation=validateProject(files);
 if(!validation.valid)return {status:'validation_failed',validation,reviewRequired:true,publicationAuthorized:false};
 const manifest=Object.keys(files).sort().map(path=>({path,bytes:Buffer.byteLength(files[path]),sha256:createHash('sha256').update(files[path]).digest('hex')}));
 return {status:'draft',files,manifest,revision,validation,reviewRequired:true,executable:false,publicationAuthorized:false};
}
