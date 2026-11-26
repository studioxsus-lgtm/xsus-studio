import {readFileSync} from 'node:fs';
import opentype from 'opentype.js';
export const catalog=JSON.parse(readFileSync(new URL('fonts/catalog.json',import.meta.url)));
const cache=new Map();
export function faces(id){
 const meta=catalog.find(f=>f.id===id);if(!meta)throw TypeError('invalid_font');
 if(!cache.has(id)){
  if(cache.size>=8)cache.delete(cache.keys().next().value);
  const list=['.woff',...(meta.extension?['-ext.woff']:[])].map(ext=>{
   const bytes=readFileSync(new URL('../node_modules/@fontsource/'+id+'/files/'+id+(ext==='-ext.woff'?'-latin-ext':'-latin')+'-400-normal.woff',import.meta.url));return opentype.parse(Uint8Array.from(bytes).buffer);
  });cache.set(id,list);
 }return cache.get(id);
}
