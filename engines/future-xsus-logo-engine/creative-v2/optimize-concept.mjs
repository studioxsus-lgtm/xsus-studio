import {finishContours} from './finish-contours.mjs';
import {generativeMark} from './generative-mark.mjs';
import {geometricHarmony} from './geometric-harmony.mjs';
import {area,box} from './contours.mjs';
export function optimizeConcept(direction,seed,negative=false){
 let best=null;
 for(let i=0;i<6;i++){
 const paths=finishContours(generativeMark(direction,(seed+i*7919)>>>0,negative));
 if(!paths.length||!area(paths))continue;
 const q=geometricHarmony(paths),b=box(paths);
 const occupancy=area(paths)/Math.max(1,(b.maxX-b.minX)*(b.maxY-b.minY));
 const score=q.score-.25*Math.abs(occupancy-.42)-.0002*paths.flat().length-.12*q.tiny;
 if(q.acceptable&&(!best||score>best.score))best={paths,score,candidate:i};
 }
 return best??{paths:generativeMark(direction,seed,negative),score:null,candidate:0};
}
