import {geometricLetter} from '../graphic-v3/geometric-letter.mjs';
import {flatten,fit,combine,area,regular,transform} from './contours.mjs';
import {geometricHarmony} from './geometric-harmony.mjs';
export function originalMonogram(initial,index=0){
 const glyph=geometricLetter(initial);if(!glyph)return null;
 // Boolean cleanup uses artboard units, not normalized em units.
 const raw=flatten(glyph);
 if(!raw.length||!area(raw))return null;
 const mark=combine(fit(raw,145,165));
 if(!area(mark))return null;
 const mode=index%3;
 if(mode===0)return {paths:fit(mark,218,205),mode:'original-letter'};
 const body=[regular(mode===1?4:8,120)];
 const inset=fit(mark,mode===1?95:125,mode===1?105:140);
 if(area(combine(inset,body,'cut'))>area(inset)*.001)return null;
 const result=combine(body,inset,'cut'),ratio=area(result)/area(body);
 if(ratio<.5||ratio>.94||!geometricHarmony(result).acceptable)return null;
 return {paths:fit(result,218,205),mode:mode===1?'original-diamond':'original-octagon'};
}
