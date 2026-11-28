import {combine,area,box,similarity} from './contours.mjs';
export function finishContours(paths){
 const base=combine(paths),total=area(base);if(!total)return paths;
 const b=box(base),span=Math.min(b.maxX-b.minX,b.maxY-b.minY);
 const kept=base.filter(r=>{const b=box([r]);return area([r])>=total*.002&&Math.min(b.maxX-b.minX,b.maxY-b.minY)>=span*.018;});
 if(!kept.length)return base;
 const next=combine(kept);
 return Math.abs(area(next)/total-1)<=.008&&similarity(base,next)>=.99?next:base;
}
