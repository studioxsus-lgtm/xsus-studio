export function opticalBalance(place,{layout,width,height,occupancy,locked=false}){
 if(locked||!['central','vertical','radial','emblem'].includes(layout)||!Number.isFinite(occupancy)||occupancy<=0)return {...place};
 const factor=Math.max(1,Math.min(1.18,Math.sqrt(.48/occupancy)));
 const maxWidth=2*Math.min(place.cx-width*.08,width*.92-place.cx);
 const maxHeight=2*Math.min(place.cy-height*.08,place.y-place.size-height*.045-place.cy);
 return {...place,w:Math.max(place.w,Math.min(place.w*factor,maxWidth)),h:Math.max(place.h,Math.min(place.h*factor,maxHeight))};
}
