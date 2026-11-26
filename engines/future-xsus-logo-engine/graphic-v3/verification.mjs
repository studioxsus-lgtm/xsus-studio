import {analysis} from './color.mjs';
// Generated paths are absolute; bounding all Bezier control points gives a
// conservative convex-hull bound. This check runs before user transforms.
function envelope(commands){
 let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
 for(const [op,...p] of commands){if(op==='A')throw Error('unconverted_arc');for(let i=0;i<p.length;i+=2){xmin=Math.min(xmin,p[i]);xmax=Math.max(xmax,p[i]);ymin=Math.min(ymin,p[i+1]);ymax=Math.max(ymax,p[i+1])}}
 return {xmin,xmax,ymin,ymax};
}
export function verifyGraphic(d){
 const bounds=[],contrast=[],warnings=[];
 for(const l of d.layers){
  const b=envelope(l.commands??l.outline),s=(l.strokeWidth??0)/2;
  if(b.xmin-s<-.1||b.ymin-s<-.1||b.xmax+s>d.width+.1||b.ymax+s>d.height+.1)throw RangeError('graphic_outside_artboard');
  bounds.push({id:l.id,...b});
  const inks=l.gradient?l.gradient.stops.map(s=>s.color):[l.fill];
  const values=inks.map(c=>analysis(c).luminance);
  contrast.push({id:l.id,onWhite:Math.min(...values.map(v=>1.05/(v+.05))),onBlack:Math.min(...values.map(v=>(v+.05)/.05))});
  if(l.type==='text'&&l.fontSize*32/Math.max(d.width,d.height)<3)warnings.push('small_preview_text');
 }
 const texts=bounds.filter(b=>d.layers.find(l=>l.id===b.id).type==='text');
 for(const [i,b] of texts.entries())for(const o of bounds){
  if(o.id===b.id||texts.slice(0,i).some(t=>t.id===o.id))continue;
  if(Math.min(b.xmax,o.xmax)>Math.max(b.xmin,o.xmin)&&Math.min(b.ymax,o.ymax)>Math.max(b.ymin,o.ymin))warnings.push('overlapping_text_bounds');
 }
 const center=bounds.reduce((a,b)=>a+(b.xmin+b.xmax)/2,0)/bounds.length;
 return {bounds,contrast,heuristics:{horizontalCenterOffset:Math.abs(center-d.width/2)/d.width,review:[...new Set(warnings)]}};
}
