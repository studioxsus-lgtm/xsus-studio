import {flatten,similarity,area,combine} from '../creative-v2/contours.mjs';
export function softenCorners(commands){
 const rings=flatten(commands);
 if(!rings.length||!area(rings))return commands;
 for(const radius of [1.2,.6,.3,.15]){
 const out=[];
 for(const ring of rings){
 const corners=ring.map((p,i)=>{const a=ring[(i+ring.length-1)%ring.length],b=ring[(i+1)%ring.length];const d=Math.min(radius,Math.hypot(a[0]-p[0],a[1]-p[1])*.12,Math.hypot(b[0]-p[0],b[1]-p[1])*.12);const toward=q=>{const n=Math.hypot(q[0]-p[0],q[1]-p[1]);return n?p.map((v,k)=>v+(q[k]-v)*d/n):p;};return {p,a:toward(a),b:toward(b)};});
 out.push(['M',...corners[0].a]);for(const [i,v] of corners.entries()){if(i)out.push(['L',...v.a]);out.push(['Q',...v.p,...v.b]);}out.push(['Z']);
 }
 if(out.length>512)return commands;
 const sampled=flatten(out);
 if(sampled.flat().length>4096||!area(rings))return commands;
 // Compare both operands at the same Boolean cleanup precision.
 const original=combine(rings),rounded=combine(sampled);
 if(similarity(original,rounded)>=.995&&similarity(rings,sampled)>=.995&&Math.abs(area(sampled)/area(rings)-1)<=.005)return out;
 }
 return commands;
}
