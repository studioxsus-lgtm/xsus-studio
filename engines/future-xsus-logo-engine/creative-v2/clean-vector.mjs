import {combine,area,similarity} from './contours.mjs';
const signed=r=>r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1]},0)/2;
export function cleanVector(paths){
 const normalized=combine(paths),total=area(normalized);
 if(!total||!normalized.length)return {paths,removed:0,accepted:false};
 const outerSign=Math.sign(signed(normalized.reduce((a,b)=>area([a])>=area([b])?a:b)));
 const filtered=normalized.filter(r=>Math.sign(signed(r))!==outerSign||area([r])>=total*.008);
 const removed=normalized.length-filtered.length;
 if(!filtered.length)return {paths,removed:0,accepted:false};
 const result=combine(filtered);
 if(!result.length||similarity(normalized,result)<.98)return {paths:normalized,removed:0,accepted:false};
 return {paths:result,removed,accepted:true};
}
