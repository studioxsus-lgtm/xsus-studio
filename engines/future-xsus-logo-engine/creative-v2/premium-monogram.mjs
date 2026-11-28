import {outline} from './alphabet.mjs';
import {fit,combine,area,regular,transform} from './contours.mjs';
import {geometricHarmony} from './geometric-harmony.mjs';
export async function premiumMonogram(initial,style,index){
 const glyph=fit(await outline(initial,style),136,154);
 const modes=['standalone','shield','diamond','round'];
 const mode=modes[index%modes.length];
 if(mode==='standalone')return {paths:fit(glyph,218,205),mode};
 const n=mode==='shield'?6:mode==='diamond'?4:48;
 const body=[regular(n,110,0,0,mode==='diamond'?Math.PI/4:-Math.PI/2)];
 for(const scale of [.88,.76,.64]){
 const cut=transform(glyph,(x,y)=>[x*scale,y*scale]);
 const outside=area(combine(cut,body,'cut'));
 if(outside>area(cut)*.001)continue;
 const result=combine(body,cut,'cut'),ratio=area(result)/area(body);
 if(ratio<.55||ratio>.94||!geometricHarmony(result).acceptable)continue;
 return {paths:fit(result,218,205),mode};
 }
 return {paths:fit(glyph,218,205),mode:'standalone'};
}
