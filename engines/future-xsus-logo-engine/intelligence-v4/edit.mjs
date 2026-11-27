import {assertLocks} from './locks.mjs';
export {assertLocks} from './locks.mjs';
import {parseInstruction,normalize} from './interpret.mjs';
import {digest,view} from './fingerprint.mjs';
import {renderGraphic} from '../graphic-v3/scene.mjs';
import {shape} from '../creative-v2/fusion.mjs';
import {monogram} from '../creative-v2/alphabet.mjs';
import {fit,layer,box} from '../creative-v2/contours.mjs';
import {booleanPaths} from '../graphic-v3/boolean.mjs';
import {samplePath,editNode} from '../graphic-v3/curves.mjs';
import {direction} from '../graphic-v3/style.mjs';
import {faces,catalog} from '../graphic-v3/font-files.mjs';
import {typeset} from '../graphic-v3/typography.mjs';
import {gradient} from '../graphic-v3/color.mjs';
const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const identity=[1,0,0,1,0,0];
function point(m,[x,y]){return [m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]}
export function paths(l){
 let rings;
 if(l.type==='circle')rings=[Array.from({length:48},(_,i)=>[l.cx+l.r*Math.cos(i*Math.PI/24),l.cy+l.r*Math.sin(i*Math.PI/24)])];
 else if(l.type==='polygon')rings=[l.points.map(p=>[p.x??p[0],p.y??p[1]])];
 else if(l.commands||l.outline)rings=samplePath(l.commands??l.outline,.5);
 else {const w=l.fontSize*l.text.length*.58;rings=[[[l.x-w/2,l.y-l.fontSize],[l.x+w/2,l.y-l.fontSize],[l.x+w/2,l.y],[l.x-w/2,l.y]]]}
 return l.matrix?rings.map(r=>r.map(p=>point(l.matrix,p))):rings;
}
function frame(l){const b=box(paths(l));return {x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,w:b.maxX-b.minX,h:b.maxY-b.minY}}
function affine(l,a,b,c,d,dx=0,dy=0){
 const f=frame(l),[u,v,w,z,x,y]=l.matrix??identity;const tx=f.x-a*f.x-c*f.y+dx,ty=f.y-b*f.x-d*f.y+dy;
 l.matrix=[a*u+c*v,b*u+d*v,a*w+c*z,b*w+d*z,a*x+c*y+tx,b*x+d*y+ty].map(n=>Math.round(n*1e6)/1e6);
}
const type=(l,patch)=>{const v={...l,...patch},id=v.fontId??'dm-sans';
 return typeset({...v,fontId:id},faces(id),{tracking:v.trackingEm??0,curve:v.curve??0,stretch:v.stretch??1,along:v.along??null});};
function target(doc,p,selected,memory){
 let items=doc.layers;
 if(p.last)items=items.filter(l=>l.id===memory.lastAdded);
 else if(p.letter)items=items.filter(l=>l.text?.toLowerCase()===p.letter||l.glyph?.toLowerCase()===p.letter);
 else if(p.target==='slogan')items=items.filter(l=>l.id==='brand-slogan');
 else if(p.target==='text')items=items.filter(l=>l.type==='text'&&l.id!=='brand-slogan');
 else if(p.target==='symbol')items=items.filter(l=>l.type!=='text');
 if(p.left&&items.length>1){
  const order=items.map(l=>[frame(l).x,l]).sort((a,b)=>a[0]-b[0]);if(order[1][0]-order[0][0]<.5)throw Error('ambiguous_target');return order[0][1];
 }
 const chosen=items.find(l=>l.id===selected);
 if(chosen)return chosen;
 if(items.length===1)return items[0];
 if(!p.target&&!p.letter&&!p.last&&memory.focus){const prev=items.find(l=>l.id===memory.focus);if(prev)return prev}
 throw Error('ambiguous_target');
}
const typeOps=['font','previousFont','tracking','weight','rename','outline'];
export async function candidate({document,variants,selected,secondary,memory={},instruction,requestId}){
 const p=parseInstruction(instruction),doc=structuredClone(view(document)),ls=doc.layers;
 if(typeOps.includes(p.op)&&!p.target)p.target='text';
 const whole=['palette','mix','add','slogan','wordmark','monogram'];
 let l=whole.includes(p.op)?null:target(doc,p,selected,memory);
 const newId='v4-'+digest(requestId).slice(0,18);
 const seen=new Set(),num=p.nums[0],factor=p.direction===1?1.15:.85;
 const set=(obj,patch)=>{Object.assign(obj,patch);seen.add(obj.id)};
 const create=obj=>{if(ls.some(l=>l.id===obj.id)||ls.length>=256)throw Error('layer_exists');ls.push(obj);seen.add(obj.id);return obj};
 const paint=(obj,color)=>{if(!color)throw Error('color_required');set(obj,{fill:color});delete obj.gradient};
 const other=()=>{const b=ls.find(x=>x.id===secondary&&x!==l);if(!b)throw Error('second_target_required');return b};
 const selectVariant=i=>{if(!Number.isInteger(i)||!variants[i])throw Error('variant_required');return variants[i]};
 if(l)seen.add(l.id);
 switch(p.op){
 case 'color':paint(l,p.colors[0]);break;
 case 'variantColor':{const src=selectVariant(p.variants[0]).layers.find(v=>v.type===l.type);if(!src)throw Error('ambiguous_target');paint(l,src.fill);break}
 case 'palette':{const colors=p.colors.length?p.colors:['#171717','#595959'];ls.forEach((v,i)=>paint(v,colors[i%colors.length]));break}
 case 'gradient':if(p.colors.length<2)throw Error('two_colors_required');set(l,{gradient:gradient('linear',p.colors[0],p.colors[1],num??35)});break;
 case 'dark':case 'light':case 'contrast':paint(l,p.op==='dark'?'#f5f5f5':'#172439');break;
 case 'brightness':case 'saturation':{const rgb=l.fill.slice(1).match(/../g).map(v=>parseInt(v,16)),gray=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2],delta=clamp(num??18,1,100)/100*p.direction;
  paint(l,'#'+rgb.map(v=>Math.round(clamp(p.op==='brightness'?v+255*delta:gray+(v-gray)*(1+delta),0,255)).toString(16).padStart(2,'0')).join(''));break}
 case 'opacity':if(num===undefined||num<0||num>100)throw Error('percentage_required');l.opacity=num>1?num/100:num;break;
 case 'stroke':if(num===undefined||num<0||num>128)throw Error('width_required');set(l,{stroke:p.colors[0]??l.fill,strokeWidth:num});break;
 case 'rotate':{const angle=(num??15)*Math.PI/180;affine(l,Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle));break}
 case 'mirror':affine(l,p.axis==='x'?-1:1,0,0,p.axis==='y'?-1:1);break;
 case 'scale':{const f=num===undefined?factor:clamp(1+p.direction*Math.abs(num)/100,.05,6);affine(l,f,0,0,f);break}
 case 'move':{const n=clamp(Math.abs(num??12),0,2048)*p.direction;affine(l,1,0,0,1,p.axis==='x'?n:0,p.axis==='y'?n:0);break}
 case 'align':{const f=frame(l);affine(l,1,0,0,1,doc.width/2-f.x,0);break}
 case 'node':if(!l.commands||p.nums.length!==3)throw Error('node_parameters_required');l.commands=editNode(l.commands,num,'move',p.nums.slice(1));break;
 case 'delete':case 'removeLast':ls.splice(ls.indexOf(l),1);break;
 case 'order':ls.splice(ls.indexOf(l),1);if(p.direction>0)ls.push(l);else ls.unshift(l);break;
 case 'group':{const b=other(),id='g-'+newId;ls.splice(ls.indexOf(b),1);ls.splice(ls.indexOf(l)+1,0,b);set(l,{group:id});set(b,{group:id});break}
 case 'ungroup':if(!l.group)throw Error('group_required');for(const item of ls.filter(v=>v.group===l.group)){seen.add(item.id);delete item.group}break;
 case 'union':case 'divide':case 'cut':case 'simplify':{const b=p.op==='simplify'?null:other(),parts=booleanPaths(({union:'union',divide:'divide',cut:'difference',simplify:'simplify'})[p.op],paths(l),b?paths(b):[]).filter(x=>x.length);
  if(!parts.length)throw Error('empty_result');if(b){seen.add(b.id);ls.splice(ls.indexOf(b),1)}
  const sources=[l,...(b?[b]:[])].map(({sources,...original})=>original);
  ls.splice(ls.indexOf(l),1,...parts.map((part,i)=>({...layer(i?newId+'-'+i:l.id,part,l.fill),sources})));break}
 case 'replace':case 'add':case 'monogram':{
  if(p.op!=='monogram'&&!p.image)throw Error('symbol_required');
  if(memory.forbidden?.includes(p.image))throw Error('forbidden_symbol');
  const symbol=p.op==='monogram'?await monogram(p.quote??'', 'minimal','woven'):shape(p.image,11,2);
  const f=l?frame(l):{w:doc.width*.28,h:doc.height*.28,x:doc.width*.5,y:doc.height*.36};
  const mark={...layer(l?.id??newId,fit(symbol,f.w,f.h,f.x,f.y),p.colors[0]??l?.fill??'#254275'),subject:p.image??p.quote};
  if(l)ls.splice(ls.indexOf(l),1,mark);else l=create(mark);break}
 case 'slogan':case 'wordmark':{if(!p.quote)throw Error('quoted_text_required');const id=p.op==='slogan'?'brand-slogan':'brand-name';
  l=create(type({id,type:'text',text:p.quote,x:doc.width/2,y:doc.height*(p.op==='slogan'?.9:.76),fontSize:Math.min(doc.width/p.quote.length,doc.height*.06),fill:'#172439'},{}));break}
 case 'font':case 'previousFont':case 'weight':case 'tracking':case 'rename':{
  if(l.type!=='text')throw Error('text_target_required');let patch;
  if(p.op==='rename'){if(!p.quote)throw Error('quoted_text_required');patch={text:p.quote}}
  else if(p.op==='tracking'){if(num===undefined||Math.abs(num)>1)throw Error('tracking_required');patch={trackingEm:num}}
  else if(p.op==='weight'){patch={stroke:l.fill,strokeWidth:clamp((num??700)/700*l.fontSize*.032,.1,4),fontWeight:clamp(num??700,100,900)}}
  else {const old=memory.previousFonts?.[l.id],match=catalog.find(f=>normalize(instruction).includes(normalize(f.family))||normalize(instruction).includes(f.id));const font=p.op==='previousFont'?old:match?.id;if(!font)throw Error('font_required');patch={fontId:font}}
  set(l,type(l,patch));break}
 case 'outline':if(!l.outline)throw Error('outline_required');set(l,{type:'path',commands:l.outline,sourceText:structuredClone(l)});delete l.outline;break;
 case 'mix':{const symbol=selectVariant(p.variants[0]).layers.filter(x=>x.type!=='text'),text=selectVariant(p.variants[1]).layers.filter(x=>x.type==='text');
  if(!symbol.length||!text.length)throw Error('missing_component');doc.layers=structuredClone([...symbol,...text]);doc.layers.forEach(v=>seen.add(v.id));break}
 case 'style':{const st=direction(p.styles.length?p.styles:['modern']);affine(l,st.ratio,0,st.slant,1);if(l.type==='text')set(l,type(l,{trackingEm:st.tracking}));else if(st.stroke)set(l,{stroke:l.fill,strokeWidth:st.stroke});break}
 case 'app':{const f=frame(l),s=Math.min(doc.width*.76/Math.max(1,f.w),doc.height*.76/Math.max(1,f.h));affine(l,s,0,0,s,doc.width/2-f.x,doc.height/2-f.y);break}
 case 'print':if(l.type==='text')set(l,type(l,{fontSize:Math.max(l.fontSize,doc.height*.065)}));else set(l,{stroke:l.fill,strokeWidth:Math.max(1.25,l.strokeWidth??0)});break;
 default:throw Error('unsupported_instruction');
 }
 if(p.protectedText&&!same(document.layers.filter(x=>x.type==='text'),doc.layers.filter(x=>x.type==='text')))throw Error('protected_text');
 assertLocks(document,doc,memory);renderGraphic(doc);
 if(same(document.layers,doc.layers))throw Error('no_change');
 return {document:doc,operation:p.op,targets:[...seen],params:p,focus:l?.id??null,added:doc.layers.find(v=>!document.layers.some(x=>x.id===v.id))?.id};
}
