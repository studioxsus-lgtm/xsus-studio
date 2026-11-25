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
 const menuLabel={en:'Navigation',sq:'Navigimi',fr:'Navigation'}[language];
 const header=renderComponent('header',{brand:name,links}).replace('<nav aria-label="Main">','<details class="xs-mobile-nav" open><summary>'+menuLabel+'</summary><nav aria-label="'+menuLabel+'">').replace('</nav>','</nav></details>');
 const footer=renderComponent('footer',{text:name});
 const components=page.components??[];
 if(!Array.isArray(components)||components.length>30)throw new TypeError('Invalid components');
 const extra=components.map(c=>{if(!['metrics','chart','form','products'].includes(c.kind))throw new TypeError('Unsupported page component');return renderComponent(c.kind,c.props)}).join('');
 files[page.path]=files[page.path].replace('<body>','<body>'+header).replace('</main>',extra+'</main>').replace('</body>',footer+'</body>');
 }
 files['design.css']+=componentCss+' .xs-mobile-nav{min-width:0}.xs-mobile-nav summary{cursor:pointer;padding:.75rem;min-height:44px}.xs-mobile-nav nav a{padding:.5rem;overflow-wrap:anywhere}@media(min-width:641px){.xs-mobile-nav summary{display:none}.xs-mobile-nav:not([open])>nav{display:flex}}@media(max-width:640px){.xs-mobile-nav{width:100%}.xs-mobile-nav nav{flex-direction:column;gap:.25rem}}';
 if(design.palette==='studio')files['design.css']+="\nbody>header{position:sticky;top:0;z-index:2;backdrop-filter:blur(16px);background:color-mix(in srgb,var(--bg) 90%,transparent);border-bottom:1px solid color-mix(in srgb,var(--accent) 25%,transparent);padding:1rem clamp(1rem,4vw,4rem);display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}body>header nav{display:flex;gap:1rem;flex-wrap:wrap}body>header a{text-decoration:none}body>header a[aria-current=page]{text-decoration:underline;text-underline-offset:.35em}main>h1{letter-spacing:-.045em;margin-block:clamp(2rem,6vw,5rem) 1rem}main>section:first-of-type{padding:clamp(2rem,6vw,5rem);background:linear-gradient(135deg,var(--surface),color-mix(in srgb,var(--accent) 12%,var(--surface)));border:1px solid color-mix(in srgb,var(--accent) 30%,transparent)}main>section{box-shadow:0 12px 40px #0000000d}main>section p{max-width:70ch}main .item{border-color:color-mix(in srgb,var(--accent) 35%,transparent);padding:clamp(1rem,3vw,2rem)}body>footer{padding:2rem clamp(1rem,4vw,4rem);border-top:1px solid color-mix(in srgb,var(--accent) 25%,transparent)}@media(max-width:640px){body>header{position:static}body>header nav{gap:.75rem}main>section:first-of-type{padding:1.5rem}}";
 const validation=validateProject(files);
 if(!validation.valid)return {status:'validation_failed',validation,reviewRequired:true,publicationAuthorized:false};
 const manifest=Object.keys(files).sort().map(path=>({path,bytes:Buffer.byteLength(files[path]),sha256:createHash('sha256').update(files[path]).digest('hex')}));
 return {status:'draft',files,manifest,revision,validation,reviewRequired:true,executable:false,publicationAuthorized:false};
}
