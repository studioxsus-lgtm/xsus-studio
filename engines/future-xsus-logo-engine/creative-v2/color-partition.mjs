import {combine,area,box} from './contours.mjs';
export function colorPartition(paths,index=0){
 const b=box(paths),w=b.maxX-b.minX,h=b.maxY-b.minY,total=area(paths);
 if(!total||!w||!h)return null;
 const x=b.minX,y=b.minY;
 const angles=[.35,-.35,0,1,-1];
 for(const shift of [.15,0,-.15]){
 const slope=angles[index%angles.length],a=y+h*(.5+shift-slope/2),z=y+h*(.5+shift+slope/2);
 const mask=[[[x-w,a-h*slope],[x+2*w,z+h*slope],[x+2*w,y+4*h],[x-w,y+4*h]]];
 const accent=combine(paths,mask,'intersect'),main=combine(paths,mask,'cut');
 const share=area(accent)/total;
 if(main.length&&accent.length&&share>=.18&&share<=.72)return {main,accent,share};
 }
 return null;
}
