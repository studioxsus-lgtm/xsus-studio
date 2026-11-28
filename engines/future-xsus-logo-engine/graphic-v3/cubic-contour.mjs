import {flatten,combine,area,similarity} from '../creative-v2/contours.mjs';
export function cubicContour(commands){
 if(commands.some(c=>!['M','L','Z'].includes(c[0])))return commands;
 const rings=flatten(commands);if(!rings.length||!area(rings))return commands;
 for(const tension of [.12,.06,.03]){
 const out=[];
 for(const ring of rings){
 out.push(['M',...ring[0]]);
 for(let i=0;i<ring.length;i++){
 const a=ring[(i+ring.length-1)%ring.length],b=ring[i],c=ring[(i+1)%ring.length],d=ring[(i+2)%ring.length];
 const control=(p,q,r)=>p.map((v,k)=>v+tension*(q[k]-r[k]));
 out.push(['C',...control(b,c,a),...control(c,b,d),...c]);
 }
 out.push(['Z']);
 }
 if(out.length>512)return commands;
 const sampled=flatten(out);if(sampled.flat().length>4096)return commands;
 const base=combine(rings),next=combine(sampled);
 if(next.length===base.length&&similarity(base,next)>=.995&&Math.abs(area(sampled)/area(rings)-1)<=.005)return out;
 }
 return commands;
}
