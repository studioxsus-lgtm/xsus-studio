import {verifyGraphic} from './verification.mjs';
import {direction,detectStyles} from './style.mjs';
import {composition,layouts} from './composition.mjs';
import {gradient,finishes} from './color.mjs';
import {renderGraphic} from './scene.mjs';
import {faces,catalog} from './font-files.mjs';
import {typeset} from './typography.mjs';
import {flatten,box} from '../creative-v2/contours.mjs';
const defaults={'serif':'libre-baskerville','sans-serif':'dm-sans','monospace':'ibm-plex-mono'};
export function graphicOptions(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['styles','treatment','layout','font','width','height','finish','slogan','angle'].includes(k)))throw TypeError('invalid_graphic_options');
 if(p.styles!==undefined||p.treatment!==undefined)direction(p.styles??['modern'],p.treatment);
 if(p.layout!==undefined&&!layouts.includes(p.layout)||p.finish!==undefined&&!finishes.includes(p.finish)||p.font!==undefined&&!catalog.some(f=>f.id===p.font))throw TypeError('invalid_graphic_choice');
 if(p.slogan!==undefined&&(typeof p.slogan!=='string'||p.slogan.length>100||/[\u0000-\u001f]/.test(p.slogan)))throw TypeError('invalid_slogan');
 for(const k of ['width','height'])if(p[k]!==undefined&&(!Number.isInteger(p[k])||p[k]<32||p[k]>4096))throw RangeError('invalid_dimension');
 if(p.angle!==undefined&&(!Number.isFinite(p.angle)||Math.abs(p.angle)>360))throw RangeError('invalid_angle');
 return p;
}
export function enhance(kit,p,prompt=''){
 graphicOptions(p);
 const matched=detectStyles(prompt);
 const choices=p.styles??(matched.length?matched:['modern']),style=direction(choices,p.treatment);
 return {...kit,version:'3.0.0',variants:kit.variants.map(v=>{
  const old=v.document,layout=p.layout??(old.creative?.usage?.includes('app')&&/favicon|icon only/i.test(prompt)?'symbol':style.layout);
  const width=p.width??512,height=p.height??512,place=composition(layout,width,height,kit.name),layers=[];
  const mark=old.layers.filter(l=>l.type==='path'),primary=kit.palette.primary,secondary=style.monochrome?primary:kit.palette.secondary;
  if(layout!=='text'&&mark.length){
   const bbox=box(mark.flatMap(l=>flatten(l.commands))),mx=(bbox.minX+bbox.maxX)/2,my=(bbox.minY+bbox.maxY)/2;
   const bw=bbox.maxX-bbox.minX,bh=bbox.maxY-bbox.minY;
   const scale=Math.min(place.w/(bw*style.ratio+bh*Math.abs(style.slant)),place.h/bh);
   const adjust=(x,y)=>[place.cx+((x-mx)*style.ratio+(y-my)*style.slant)*scale,place.cy+(y-my)*scale].map(v=>Math.round(v*100)/100);
   for(const [i,l] of mark.entries()){
    const commands=l.commands.map(([op,...coords])=>[op,...Array.from({length:coords.length/2},(_,n)=>adjust(coords[2*n],coords[2*n+1])).flat()]);
    const fill=style.monochrome?primary:l.fill;
    const g=i===0&&!style.monochrome?gradient(p.finish??(choices.includes('gradient')?'linear':'solid'),fill,secondary,p.angle):null;
    layers.push({...l,commands,fill,...(g?{gradient:g}:{}),...(style.stroke?{stroke:fill,strokeWidth:style.stroke*Math.min(width,height)/512}:{}),hollow:style.hollow});
   }
  }
  const font=p.font??defaults[style.font],addText=(id,text,x,y,size,fontId,tracking,curve=0)=>{
   layers.push(typeset({id,type:'text',text,x,y,fontSize:size,fontId,fill:primary,fontFamily:style.font},faces(fontId),{tracking,width:place.room,curve}));
  };
  if(layout!=='symbol'){
   addText('brand-name',kit.name,place.x,place.y,place.size,font,style.tracking,layout==='circular'?-.45:0);
   if(p.slogan)addText('brand-slogan',p.slogan,place.x,place.sloganY,place.size*.50,font===defaults.serif?defaults['sans-serif']:defaults.serif,.06);
  }
  const document={...old,width,height,layers,graphic:{version:'3.0.0',styles:choices,layout,options:p}};
  const svg=renderGraphic(document);
  if(Buffer.byteLength(svg)>240000)throw RangeError('graphic_budget');
  return {...v,document,svg,quality:{...verifyGraphic(document),artboard:[width,height],layerCount:layers.length,svgBytes:Buffer.byteLength(svg)}};
 })};
}
