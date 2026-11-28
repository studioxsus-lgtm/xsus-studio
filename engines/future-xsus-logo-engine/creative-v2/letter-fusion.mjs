import {outline} from './alphabet.mjs';
import {fit,combine,area,transform} from './contours.mjs';
export const letterFusionModes=['inset','knockout','linked'];
export async function letterFusion(base,initial,style,index){
 const mode=letterFusionModes[index%3],glyph=fit(await outline(initial,style),mode==='linked'?105:135,mode==='linked'?145:150);
 const mark=fit(base,mode==='linked'?155:218,205);
 const shifted=mode==='linked'?transform(glyph,(x,y)=>[x+55,y]):glyph;
 const body=mode==='linked'?transform(mark,(x,y)=>[x-40,y]):mark;
 const overlap=combine(body,shifted,'intersect');
 const result=mode==='knockout'?combine(body,shifted,'cut'):mode==='inset'?combine(combine(body,shifted,'cut'),combine(shifted,body,'cut')):combine(body,shifted);
 const ratio=area(result)/area(body);
 if(!result.length||ratio<.35||ratio>2.8||!overlap.length)return null;
 return {paths:fit(result,218,205),mode};
}
