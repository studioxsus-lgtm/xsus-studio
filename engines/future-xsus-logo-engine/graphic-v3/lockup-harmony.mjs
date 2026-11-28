import {box,flatten} from '../creative-v2/contours.mjs';
export function lockupHarmony(layers,width,height,{locked=false}={}){
 const mark=layers.filter(l=>l.type==='path'),text=layers.find(l=>l.id==='brand-name');
 if(locked||!mark.length||!text?.outline?.length)return layers;
 const a=box(mark.flatMap(l=>flatten(l.commands))),b=box(flatten(text.outline));
 const overlapX=Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX);
 if(overlapX<=0||b.minY<a.minY)return layers;
 const gap=Math.min(width,height)*.035,dy=Math.max(0,a.maxY+gap-b.minY);
 if(!dy||dy>height*.12)return layers;
 const texts=layers.filter(l=>l.type==='text');
 if(texts.some(l=>!l.outline?.length||box(flatten(l.outline)).maxY+dy>height*.97))return layers;
 return layers.map(l=>l.type!=='text'?l:{...l,y:l.y+dy,outline:l.outline.map(([op,...v])=>[op,...v.map((n,i)=>i%2?n+dy:n)])});
}
