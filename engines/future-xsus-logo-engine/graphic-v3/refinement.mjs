import {renderGraphic} from './scene.mjs';
import {verifyGraphic} from './verification.mjs';
import {pixelQuality} from './pixel-quality.mjs';
export function refineComposition(document,{locked=false}={}){
 const evaluate=d=>{const svg=renderGraphic(d),geometry=verifyGraphic(d),pixel=pixelQuality(svg);return {document:d,svg,geometry,pixel};};
 const original=evaluate(document);let best=original,attempts=0;
 const penalty=q=>q.pixel.centerOffset+q.pixel.edgeInk/Math.max(1,q.pixel.width*q.pixel.height)*4;
 if(!locked&&original.pixel.acceptable&&original.pixel.centerOffset>.12){
 const b=original.geometry.bounds;
 const left=Math.min(...b.map(x=>x.xmin)),right=Math.max(...b.map(x=>x.xmax)),top=Math.min(...b.map(x=>x.ymin)),bottom=Math.max(...b.map(x=>x.ymax));
 const dx=document.width/2-(left+right)/2,dy=document.height/2-(top+bottom)/2;
 for(const factor of [.5,1]){
  attempts++;const d=structuredClone(document),x=dx*factor,y=dy*factor;
  for(const l of d.layers){for(const key of ['commands','outline'])if(l[key])l[key]=l[key].map(([op,...v])=>[op,...v.map((n,i)=>Math.round((n+(i%2?y:x))*100)/100)]);if(l.type==='text'){l.x+=x;l.y+=y;}}
  try{const candidate=evaluate(d);if(candidate.pixel.acceptable&&candidate.geometry.heuristics.review.every(w=>original.geometry.heuristics.review.includes(w))&&penalty(candidate)+.005<penalty(best))best=candidate;}catch(e){if(!(e instanceof RangeError))throw e;}
 }
 }
 return {...best,refinement:{attempts,accepted:best!==original,before:original.pixel.centerOffset,after:best.pixel.centerOffset}};
}
