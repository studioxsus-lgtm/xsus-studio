// Original geometric uppercase A/X outlines, in normalized em coordinates.
export function geometricLetter(letter){
 const A=[['M',0,0],['L',.42,-1],['L',.58,-1],['L',1,0],['L',.79,0],['L',.66,-.32],['L',.34,-.32],['L',.21,0],['Z'],['M',.41,-.49],['L',.59,-.49],['L',.5,-.74],['Z']];
 const X=[['M',0,-1],['L',.23,-1],['L',.5,-.65],['L',.77,-1],['L',1,-1],['L',.62,-.5],['L',1,0],['L',.77,0],['L',.5,-.35],['L',.23,0],['L',0,0],['L',.38,-.5],['Z']];
 const I=[['M',.39,-1],['L',.61,-1],['L',.61,0],['L',.39,0],['Z']];
 const O=[['M',.23,-1],['L',.77,-1],['L',1,-.77],['L',1,-.23],['L',.77,0],['L',.23,0],['L',0,-.23],['L',0,-.77],['Z'],['M',.31,-.78],['L',.22,-.69],['L',.22,-.31],['L',.31,-.22],['L',.69,-.22],['L',.78,-.31],['L',.78,-.69],['L',.69,-.78],['Z']];
 const N=[['M',0,0],['L',0,-1],['L',.22,-1],['L',.78,-.35],['L',.78,-1],['L',1,-1],['L',1,0],['L',.78,0],['L',.22,-.65],['L',.22,0],['Z']];
 return ({A,X,I,O,N})[letter]??null;
}

export function geometricWordmark(layer,{width=Infinity,tracking=.12}={}){
 const chars=Array.from(layer.text),glyphs=chars.map(geometricLetter);
 if(!chars.length||chars.length>32||glyphs.some(g=>!g))return null;
 const advances=chars.map(c=>c==='I'?.48:1),units=advances.reduce((a,b)=>a+b,0)+tracking*(chars.length-1);
 const size=Math.min(layer.fontSize,width/units);
 if(!Number.isFinite(size)||size<=0)return null;
 let cursor=layer.x-units*size/2;
 const outline=[];
 for(let i=0;i<chars.length;i++){
 const offset=chars[i]==='I'?.26:0;
 for(const [op,...v] of glyphs[i])outline.push(op==='Z'?[op]:[op,Math.round((cursor+(v[0]-offset)*size)*100)/100,Math.round((layer.y+v[1]*size)*100)/100]);
 cursor+=(advances[i]+tracking)*size;
 }
 return {...layer,fontSize:size,outline,advance:units*size,trackingEm:tracking,curve:0,stretch:1,letterArchitecture:'geometric-original'};
}
