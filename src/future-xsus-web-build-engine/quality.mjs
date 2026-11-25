import {generateInteractiveWebsite} from './interactive.mjs';
import {posix} from 'node:path';
import {createHash} from 'node:crypto';
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validateProject(files){
 const errors=[];
 for(const [path,content] of Object.entries(files)){
  if(!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(html|css|js)$/.test(path)||typeof content!=='string'){errors.push({path,code:'INVALID_FILE'});continue}
  if(!path.endsWith('.html'))continue;
  for(const [pattern,code] of [[/<title>[^<]+<\/title>/i,'MISSING_TITLE'],[/<html lang="/i,'MISSING_LANGUAGE'],[/name="viewport"/i,'MISSING_VIEWPORT'],[/<h1>/i,'MISSING_HEADING']])if(!pattern.test(content))errors.push({path,code});
  for(const match of content.matchAll(/\b(?:href|src)="([^"]+)"/g)){
   const target=match[1];
   if(target.startsWith('#'))continue;
   if(!/^(?:\.\.\/)*[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(html|css|js)$/.test(target)){errors.push({path,code:'UNSUPPORTED_REFERENCE',target});continue}
   const resolved=posix.normalize(posix.join(posix.dirname(path),target));
   if(!Object.hasOwn(files,resolved))errors.push({path,code:'MISSING_TARGET',target});
  }
 }
 if(!Object.keys(files).some(p=>p.endsWith('.html')))errors.push({code:'NO_PAGES'});
 return {valid:errors.length===0,errors};
}
export function prepareExport(input,options={},metadata={}){
 const {plan,files}=generateInteractiveWebsite(input,options);
 const description=metadata.description??plan.name;
 if(typeof description!=='string'||!description.trim()||description.length>300)throw new TypeError('Invalid description');
 for(const {path} of plan.pages)files[path]=files[path].replace('</head>','<meta name="description" content="'+escape(description)+'"></head>');
 const validation=validateProject(files);
 if(!validation.valid)throw new Error('Static validation failed');
 const manifest=Object.keys(files).sort().map(path=>({path,bytes:Buffer.byteLength(files[path]),sha256:createHash('sha256').update(files[path]).digest('hex')}));
 return {plan,files,manifest,validation,publicationAuthorized:false};
}
