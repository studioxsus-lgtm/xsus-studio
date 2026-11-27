import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Resvg} from '@resvg/resvg-js';
import {renderGraphic} from '../graphic-v3/scene.mjs';
import {signature,compare} from './signature.mjs';
export const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function view(doc){return {...doc,graphic:doc.graphic??{version:'3.0.0'}}}
export function raster(doc,size=128){
 // A square outer viewBox bounds both dimensions even for extreme artboards.
 const svg=renderGraphic(view(doc)).replace(/width="[^"]+"\s+height="[^"]+"/,'width="'+size+'" height="'+size+'"');
 const image=new Resvg(svg,{font:{loadSystemFonts:false,fontFiles:[fileURLToPath(new URL('../creative-v2/sans.ttf',import.meta.url))],defaultFontFamily:'XSUSGeometrySans',sansSerifFamily:'XSUSGeometrySans'}}).render();return signature(image.pixels,image.width,image.height);
}
export function fingerprint(doc){
 const marks=doc.layers.filter(l=>l.type!=='text');const visual=raster(doc),mark=marks.length&&marks.length!==doc.layers.length?raster({...doc,layers:marks}):visual;
 const svg=renderGraphic(view(doc));return {id:digest(svg),visual,mark,typography:doc.layers.filter(l=>l.type==='text').map(l=>[l.text,l.fontId??l.fontFamily,l.fontSize,l.fontWeight??400])};
}
export function compareGallery(docs){
 if(!docs.length||docs.length>12)throw RangeError('gallery_budget');
 const fingerprints=docs.map(fingerprint),pairs=[],groups=docs.map((_,i)=>i);
 for(let i=0;i<docs.length;i++)for(let j=0;j<i;j++){
  const a=fingerprints[i],b=fingerprints[j],score=compare(a.mark,b.mark);
  const p={first:j,second:i,...score,identical:a.id===b.id,typography:digest(a.typography)===digest(b.typography)};
  if(p.near){const from=groups[i],to=groups[j];for(let k=0;k<groups.length;k++)if(groups[k]===from)groups[k]=to}
  pairs.push(p);
 }
 return {fingerprints,pairs,groups,diversity:docs.length===1?null:Math.round(100*(1-pairs.reduce((s,p)=>s+p.structure,0)/pairs.length))};
}
