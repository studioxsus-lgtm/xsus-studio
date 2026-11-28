import {combine,area,box,similarity} from './contours.mjs';
import {colorPartition} from './color-partition.mjs';
export function structuralColor(paths,index=0){
 const total=area(paths),b=box(paths);if(!total)return null;
 let best=null;
 for(const axis of [0,1]){
 const mid=axis===0?(b.minX+b.maxX)/2:(b.minY+b.maxY)/2;
 const x=b.minX-1,y=b.minY-1,X=b.maxX+1,Y=b.maxY+1;
 const mask=axis===0?[[[x,y],[mid,y],[mid,Y],[x,Y]]]:[[[x,y],[X,y],[X,mid],[x,mid]]];
 const accent=combine(paths,mask,'intersect'),main=combine(paths,mask,'cut'),share=area(accent)/total;
 if(share<.22||share>.65||[...main,...accent].some(r=>area([r])<total*.002))continue;
 if(similarity(paths,combine(main,accent))<.995)continue;
 const score=Math.abs(share-.5)+.03*(main.length+accent.length)+.01*((index+axis)%2);
 if(!best||score<best.score)best={main,accent,share,score};
 }
 return best??colorPartition(paths,index);
}
