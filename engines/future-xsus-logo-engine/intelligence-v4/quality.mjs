import {fileURLToPath} from 'node:url';
import {Resvg} from '@resvg/resvg-js';
import {analysis} from '../graphic-v3/color.mjs';
import {renderGraphic} from '../graphic-v3/scene.mjs';
import {compareGallery,view} from './fingerprint.mjs';
const clamp=n=>Math.round(Math.max(0,Math.min(100,n)));
const ratio=(a,b)=>{const x=analysis(a).luminance,y=analysis(b).luminance;return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
export const scales=[16,24,32,48,64,128,256,512,1024,2048];
export function scaleProof(d){
 const svg=renderGraphic(view(d)),results=[];let reference;
 for(const size of [...scales].reverse()){
  const image=new Resvg(svg.replace(/width="[^"]+"\s+height="[^"]+"/,'width="'+size+'" height="'+size+'"'),{font:{loadSystemFonts:false,fontFiles:[fileURLToPath(new URL('../creative-v2/sans.ttf',import.meta.url))],defaultFontFamily:'XSUSGeometrySans',sansSerifFamily:'XSUSGeometrySans'}}).render();
  const pix=image.pixels;let solid=0,alpha=0;for(let i=3;i<pix.length;i+=4){solid+=pix[i]>=192;alpha+=pix[i]/255}
  reference??=alpha/(size*size);const coverage=alpha/(size*size);
  results.push({size,coverage,solidPixels:solid,coverageDrift:Math.abs(reference-coverage),minTextPixels:minText(d,size)});
 }return results.reverse();
}
function minText(d,size){const t=d.layers.filter(l=>l.type==='text');return t.length?Math.min(...t.map(l=>l.fontSize))*size/Math.max(d.width,d.height):null}
export function quality(doc,fp,{diversity=null,preferred=false,surface='#ffffff'}={}){
 const texts=doc.layers.filter(l=>l.type==='text'),name=texts.find(l=>l.id==='brand-name'),c=doc.creative??{},g=doc.graphic??{};
 const inks=doc.layers.flatMap(l=>l.gradient?.stops.map(s=>s.color)??[l.fill]);
 const contrast=inks.length?Math.min(...inks.map(i=>ratio(i,surface))):1;
 const commands=doc.layers.reduce((s,l)=>s+(l.commands??l.outline??l.points??[]).length,0),size=minText(doc,128);
 const usage=c.usage??[],dimensions=[],issues=[];
 const add=(key,value,weight,evidence,kind='heuristic')=>dimensions.push({key,score:value===null?null:clamp(value),weight,evidence,kind,confidence:value===null?'unavailable':kind==='measurement'?'high':'limited'});
 const intended=c.name??null,brandMatch=name&&intended?name.text===intended:null;
 add('brief',brandMatch===null?null:brandMatch?100:30,2,{requestedBrand:intended,renderedBrand:name?.text??null});
 add('identity',preferred?100:brandMatch===null?null:brandMatch?100:40,2,{preferred,brandMatch});
 add('industry',c.category&&c.subjects?.length?70:null,c.category?1.5:1,{profile:c.category??null,subjects:c.subjects??[]});
 add('style',g.styles?.length?100:null,g.styles?.includes('minimalist')?1.7:1,{applied:g.styles??[]});
 add('legibility',size===null?null:100*size/9,2,{minTextAt128:size});
 add('typography',texts.length?100*texts.filter(t=>t.outline?.length&&t.fontId).length/texts.length:null,1.5,{fonts:texts.map(t=>t.fontId??t.fontFamily??null)});
 add('contrast',100*contrast/4.5,2,{minimumInkContrast:contrast,surface},'measurement');
 const palette=fp.visual.palette;
 add('harmony',palette.length?100-9*Math.max(0,palette.length-3):null,1,{sampledPalette:palette});
 add('balance',100-100*Math.hypot(fp.visual.center[0]-.5,fp.visual.center[1]-.5),1.5,{center:fp.visual.center});
 const subtitle=texts.find(t=>t.id==='brand-slogan');
 add('hierarchy',name&&subtitle?Math.min(100,60*name.fontSize/subtitle.fontSize):null,1,{nameSize:name?.fontSize,sloganSize:subtitle?.fontSize});
 add('precision',doc.layers.length?100:0,1,{validated:true,layers:doc.layers.length},'measurement');
 add('contours',doc.layers.length?100*Math.min(1,512/Math.max(1,commands/doc.layers.length)):0,1,{commandCount:commands});
 add('negativeSpace',fp.mark.area?100-100*Math.max(0,fp.mark.area-.75):0,1,{occupied:fp.mark.area,holes:fp.mark.holes});
 add('complexity',100/(1+commands/4500),g.styles?.includes('minimalist')?2:1,{commands});
 add('simplicity',100/(1+Math.max(0,fp.mark.components-5)/12),1,{islands:fp.mark.components});
 add('scalability',100*Math.min(1,fp.mark.area*16*16/16),usage.includes('app')?3:1.5,{occupiedAt64:fp.mark.area});
 add('diversity',diversity,1.5,{nearestVariantDifference:diversity});
 add('digital',size===null?100:100*size/7,usage.includes('web')||usage.includes('app')?2:1,{minTextAt128:size});
 add('print',doc.layers.length?100*Math.min(1,contrast/3):null,usage.includes('print')?2:1,{vector:true,physicalProof:false});
 add('editability',doc.layers.length?100*doc.layers.filter(l=>!!l.id).length/doc.layers.length:0,1,{layerIds:doc.layers.map(l=>l.id)},'measurement');
 if(contrast<3)issues.push({code:'low_contrast',layer:doc.layers.find(l=>ratio(l.fill,surface)<3)?.id??null});
 if(size!==null&&size<6)issues.push({code:'small_type',layer:texts.reduce((a,b)=>a.fontSize<b.fontSize?a:b).id});
 if(commands>2400)issues.push({code:'dense_paths',layer:doc.layers.find(l=>l.type==='path')?.id});
 if(Math.abs(fp.visual.center[0]-.5)>.20)issues.push({code:'off_center'});
 const measured=dimensions.filter(d=>d.score!==null),weight=measured.reduce((s,d)=>s+d.weight,0);
 return {score:clamp(measured.reduce((s,d)=>s+d.score*d.weight,0)/weight),dimensions,issues,confidence:measured.length/20,
 explanation:{subjects:c.subjects??[],fonts:texts.map(t=>t.fontId??t.fontFamily??null),inks:[...new Set(inks)],layout:g.layout??null,usage},surface};
}
export function reviewGallery(docs,memory={},surface='#ffffff'){
 const comparisons=compareGallery(docs);
 const ranking=docs.map((d,i)=>{
  const peers=comparisons.pairs.filter(p=>p.first===i||p.second===i);
  const report=quality(d,comparisons.fingerprints[i],{diversity:peers.length?100*(1-Math.max(...peers.map(p=>p.structure))):null,preferred:memory.preferred?.includes(i),surface});
  return {index:i,...report,rejected:memory.rejected?.includes(i)??false};
 }).sort((a,b)=>Number(a.rejected)-Number(b.rejected)||b.score-a.score||a.index-b.index);
 return {...comparisons,ranking};
}
