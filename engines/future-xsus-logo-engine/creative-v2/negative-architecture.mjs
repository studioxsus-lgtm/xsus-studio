import {combine,line,fit,area,box} from './contours.mjs';
import {architecturalMark} from './architecture.mjs';
import {geometricHarmony} from './geometric-harmony.mjs';
export function negativeArchitecture(index,seed=0){
 const base=architecturalMark(index,seed),b=box(base),total=area(base),h=b.maxY-b.minY,w=b.maxX-b.minX;
 const original=geometricHarmony(base);
 const channels=[
 [[-w,0],[w,0]],
 [[0,-h],[0,h]],
 [[-w,h*.35],[0,-h*.15],[w,h*.35]],
 [[-w,-h*.35],[0,h*.15],[w,-h*.35]]
 ];
 let best=null;
 for(let j=0;j<channels.length;j++){
 const k=(index+j)%channels.length;
 for(const width of [Math.min(w,h)*.065,Math.min(w,h)*.09]){
 const carved=combine(base,line(channels[k],width),'cut'),ratio=area(carved)/total;
 if(!carved.length||ratio<.72||ratio>.97)continue;
 const q=geometricHarmony(carved);
 if(!q.acceptable||q.tiny>original.tiny||q.score<original.score-.15)continue;
 const score=q.score-.25*Math.abs(ratio-.87)-j*.015;
 if(!best||score>best.score)best={paths:carved,score};
 }
 }
 return fit(best?.paths??base,218,205);
}
