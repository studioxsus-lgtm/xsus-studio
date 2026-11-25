import {generateUnifiedProject} from './pipeline.mjs';
import {defineResource} from './backend.mjs';
import {createProject} from './index.mjs';
const engines=new Set(['commerce','booking','notifications','media','security','query','analytics','workflow','runtime','relations']);
export function compileCustomWebsite({name,pages,resources=[],capabilities=[],language='en',design={}}={}){
 if(!Array.isArray(pages)||!pages.length||pages.length>100||!Array.isArray(resources)||resources.length>30||!Array.isArray(capabilities)||capabilities.length>engines.size||!['en','sq','fr'].includes(language))throw TypeError('Invalid specification');
 const base=createProject({name,pages:pages.map(p=>p.path)});
 if(!base.pages.some(p=>p.path==='index.html'))throw TypeError('Home page required');
 const schemas=resources.map(r=>defineResource(r.name,r.fields));
 if(new Set(schemas.map(r=>r.name)).size!==schemas.length)throw TypeError('Duplicate resource');
 if(capabilities.some(c=>!engines.has(c))||new Set(capabilities).size!==capabilities.length)throw TypeError('Invalid capability');
 const normalized=pages.map(p=>{if(typeof p.title!=='string'||!p.title.trim()||p.title.length>200||!Array.isArray(p.sections)||!p.sections.length||p.sections.length>40)throw TypeError('Invalid page');return {path:p.path,title:p.title,sections:structuredClone(p.sections),components:structuredClone(p.components??[])}});
 return {name:base.name,pages:normalized,resources:schemas,language,design:structuredClone(design),integrations:capabilities.map(engine=>({engine,module:engine+'.mjs',wired:false})),reviewRequired:true,executable:false};
}
export function generateCustomWebsite(input){
 const plan=compileCustomWebsite(input);
 const project=generateUnifiedProject({name:plan.name,pages:plan.pages,language:plan.language,design:plan.design});
 return {plan,project,runtimeConnected:false,publicationAuthorized:false};
}
