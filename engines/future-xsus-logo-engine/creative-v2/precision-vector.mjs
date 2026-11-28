import {combine,area,box,similarity} from './contours.mjs';
export function precisionVector(paths){
 const normalized=combine(paths),total=area(normalized);
 if(!total)return paths;
 const b=box(normalized),span=Math.min(b.maxX-b.minX,b.maxY-b.minY);
 const kept=normalized.filter(r=>{const b=box([r]);return area([r])>=total*.0015&&Math.min(b.maxX-b.minX,b.maxY-b.minY)>=span*.012;});
 if(!kept.length)return normalized;
 const candidate=combine(kept);
 return Math.abs(area(candidate)/total-1)<=.012&&similarity(normalized,candidate)>=.988?candidate:normalized;
}
