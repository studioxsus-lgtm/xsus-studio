import {readFileSync} from 'node:fs';
import {catalogIds} from '../symbol-catalog.mjs';
import {textColor} from '../design.mjs';
export const fold=s=>s.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const profiles=readFileSync(new URL('profiles.tsv',import.meta.url),'utf8').trim().split('\n').flatMap(row=>{
 const [sectors,family,primary,items]=row.split('\t');
 const sector=sectors.split('|');
 return items.split(';').map(item=>{
  const [labels,symbol]=item.split(':'),names=labels.split('/');
  if(!catalogIds.includes(symbol)||names.length!==3)throw Error('invalid_profile:'+item);
  return {id:names[0],names,sector,family,symbol,primary,secondary:textColor(primary),
   typography:['jewelry','hospitality','fashion','restaurants'].includes(sector[0])?'luxury':'minimal',
   composition:['network','modular'].includes(family)?'linked':'carved'};
 });
});
const terms=profiles.flatMap(profile=>profile.names.map(name=>({s:' '+fold(name)+' ',profile}))).sort((a,b)=>b.s.length-a.s.length);
export function classify(text,hint){
 const hay=' '+fold(text)+' ';
 return terms.find(t=>hay.includes(t.s))?.profile??profiles.find(p=>p.sector.some(n=>hay.includes(' '+fold(n)+' ')))??profiles.find(p=>p.sector[0]===hint);
}
