import {opticalSpacing} from './optical-spacing.mjs';
import {letterPoint} from './letter-architecture.mjs';
import {baseline} from './curves.mjs';
// Shape real glyphs; the source text and parameters remain available for editing.
export function typeset(layer,fonts,{tracking=0,width=Infinity,curve=0,along=null,stretch=1,letterArchitecture='original',optical=false}={}){
 if(!Number.isFinite(stretch)||stretch<.4||stretch>2.5)throw RangeError('invalid_type_width');
 const guide=along?baseline(along):null;if(guide)width=Math.min(width,guide.length);
 const chars=Array.from(layer.text.normalize('NFC'));if(chars.length>160||!Number.isFinite(tracking)||Math.abs(tracking)>100||!Number.isFinite(curve)||Math.abs(curve)>1)throw RangeError('invalid_type');
 const runs=[];for(const char of chars){
  const font=fonts.find(f=>f.charToGlyphIndex(char)!==0);if(!font)throw Error('missing_glyph');
  if(runs.at(-1)?.font===font)runs.at(-1).text+=char;else runs.push({font,text:char});
 }
 const glyphs=runs.flatMap(r=>{
  let shaped;try{shaped=r.font.stringToGlyphs(r.text)}catch(error){
   if(!/substFormat: .*not yet supported/.test(error.message))throw error;
   shaped=Array.from(r.text,c=>r.font.charToGlyph(c));
  }return shaped.map(g=>({g,font:r.font}));
 });
 const advances=glyphs.map(({g,font},i)=>((g.advanceWidth??font.unitsPerEm)+(glyphs[i+1]?.font===font?font.getKerningValue(g,glyphs[i+1].g):0))/font.unitsPerEm);
 const gaps=optical?opticalSpacing(glyphs,advances,tracking):glyphs.map((_,i)=>i===glyphs.length-1?0:tracking);
 const units=advances.reduce((a,b)=>a+b,0)+gaps.reduce((a,b)=>a+b,0),size=Math.min(layer.fontSize,width/(stretch*units));
 if(!Number.isFinite(size)||size<=0)throw RangeError('invalid_font_size');
 const length=units*size*stretch;let cursor=-length/2;
 const commands=[];
 for(const [i,{g}] of glyphs.entries()){
  const center=cursor+advances[i]*size*stretch/2,t=center/Math.max(1,length/2);
  const [cx,cy,angle]=guide?guide.at(guide.length/2+center):[layer.x+center,layer.y+curve*t*t*length/4,curve*t];
  const project=(x,y)=>{[x,y]=letterPoint(x,y,size,letterArchitecture);return [cx+x*stretch*Math.cos(angle)-y*Math.sin(angle),cy+x*stretch*Math.sin(angle)+y*Math.cos(angle)].map(v=>Math.round(v*100)/100);};
  for(const c of g.getPath(-advances[i]*size/2,0,size).commands){
   const cmd=[c.type];if(['Q','C'].includes(c.type))cmd.push(...project(c.x1,c.y1));if(c.type==='C')cmd.push(...project(c.x2,c.y2));if(c.type!=='Z')cmd.push(...project(c.x,c.y));commands.push(cmd);
  }
  cursor+=(advances[i]+gaps[i])*size*stretch;
 }
 if(commands.length>8192)throw RangeError('type_budget');return {...layer,fontSize:size,outline:commands,advance:length,trackingEm:tracking,...(optical?{opticalSpacing:true}:{}),curve,stretch,...(letterArchitecture!=='original'?{letterArchitecture}:{}),...(along?{along}:{})};
}
