import {combine,area,box,transform,similarity} from './contours.mjs';
export function symmetryRefinement(paths){
 const b=box(paths),cx=(b.minX+b.maxX)/2,mirror=transform(paths,(x,y)=>[2*cx-x,y]).map(r=>r.reverse());
 if(similarity(paths,mirror)<.94)return paths;
 const candidate=combine(paths,mirror);
 return candidate.length===paths.length&&area(candidate)<=area(paths)*1.035&&similarity(paths,candidate)>=.965?candidate:paths;
}
