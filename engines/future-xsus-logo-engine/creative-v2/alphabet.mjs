import {createRuntimeFontLibrary} from '../font-runtime.mjs';
import {readFileSync} from 'node:fs';
import {fit,flatten,combine,transform,box,line} from './contours.mjs';
const fonts=createRuntimeFontLibrary();
for(const face of ['sans','serif'])fonts.register(face,readFileSync(new URL(face+'.ttf',import.meta.url)));
export const glyphs='ABCDEFGHIJKLMNOPQRSTUVWXYZËÇabcdefghijklmnopqrstuvwxyzëç0123456789';
export async function outline(c,style){
 if([...c].length!==1||!glyphs.includes(c))throw TypeError('unsupported_glyph');
 const [commands]=await fonts.shape({fontId:style==='luxury'?'serif':'sans',text:c,fontSize:160,x:0,y:0});
 let paths=combine(flatten(commands));
 if(style==='angular')paths=transform(paths,(x,y)=>[Math.round(x/3)*3,Math.round(y/3)*3]);
 if(style==='rounded')paths=paths.map(r=>r.flatMap((p,i)=>{const q=r[(i+1)%r.length];return [.15,.85].map(t=>p.map((v,k)=>v*(1-t)+q[k]*t))}));
 if(style==='futuristic')paths=transform(paths,(x,y)=>[x-y*.18,y]);
 return paths;
}
export async function monogram(text,style,mode){
 if(!text.length||text.length>5)throw RangeError('invalid_monogram');
 let joined=[],cursor=0;
 for(const [i,c] of [...text].entries()){
  let paths=await outline(c,style);const b=box(paths),w=b.maxX-b.minX;
  paths=transform(paths,(x,y)=>[cursor+(mode==='mirror'&&i%2?b.maxX-x:x-b.minX),y+(mode==='woven'?i%2*8:0)]);
  if(mode==='open')paths=combine(paths,line([[cursor-3,(b.maxY+b.minY)/2],[cursor+w+3,(b.maxY+b.minY)/2-4]],5),'cut');
  const overlap=mode==='woven'?combine(joined,paths,'intersect'):[];
  joined=combine(joined,paths);
  if(overlap.length)joined=combine(joined,overlap,'cut');
  cursor+=w*(mode==='ligature'?.73:.84);
 }
 return fit(joined,215,185);
}
