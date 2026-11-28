export function brandComposition(place,{layout,width,height,locked=false}){
 if(locked)return {...place};
 const m=Math.min(width,height);
 if(layout==='typographic')return {...place,w:Math.max(place.w,Math.min(width*.52,m*.52)),h:Math.max(place.h,Math.min(height*.43,m*.43)),cy:height*.29};
 if(layout==='horizontal'||layout==='modular')return {...place,w:Math.max(place.w,width*.36),h:Math.max(place.h,height*.65)};
 return {...place};
}
