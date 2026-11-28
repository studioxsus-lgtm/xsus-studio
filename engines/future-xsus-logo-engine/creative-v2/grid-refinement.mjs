import {combine,area,similarity,transform} from './contours.mjs';
export function gridRefinement(paths,step=2){
 if(!Number.isFinite(step)||step<=0||step>8)throw RangeError('invalid_grid');
 const candidate=combine(transform(paths,(x,y)=>[Math.round(x/step)*step,Math.round(y/step)*step]));
 const total=area(paths);
 if(!total||candidate.length!==paths.length||Math.abs(area(candidate)/total-1)>.025||similarity(paths,candidate)<.97)return paths;
 return candidate;
}
