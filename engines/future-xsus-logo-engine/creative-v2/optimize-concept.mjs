import {generativeMark} from './generative-mark.mjs';
import {geometricHarmony} from './geometric-harmony.mjs';
import {area,box} from './contours.mjs';
export function optimizeConcept(direction,seed,negative=false){
 let best=null;
 for(let i=0;i<4;i++){
 const paths=generativeMark(direction,(seed+i*7919)>>>0,negative),q=geometricHarmony(paths),b=box(paths);
 const occupancy=area(paths)/Math.max(1,(b.maxX-b.minX)*(b.maxY-b.minY));
 const score=q.score-.25*Math.abs(occupancy-.42)-.0002*paths.flat().length;
 if(q.acceptable&&(!best||score>best.score))best={paths,score,candidate:i};
 }
 return best??{paths:generativeMark(direction,seed,negative),score:null,candidate:0};
}
