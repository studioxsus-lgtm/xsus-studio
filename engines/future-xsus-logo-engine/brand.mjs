import {catalogVariants} from './symbol-catalog.mjs';
import {themedVariants} from './thematic-symbols.mjs';
import {motifVariants} from './motif.mjs';
import {conceptVariants} from './concepts.mjs';
import {typographyPlan,contrast,textColor} from './design.mjs';
import {renderEditor} from './editor.mjs';
export function brandKit(input){
 const primary=input.primary??'#d946b5', secondary=input.secondary??'#ffffff';
 const typography=typographyPlan(input.name);
 let variants;
 if(input.catalogId) variants=catalogVariants(input.catalogId,primary,secondary);
 else if(input.motif) variants=motifVariants(input.motif,primary,secondary);
 else if(input.theme) variants=themedVariants(input.theme,primary,contrast(secondary,'#ffffff')>=3?secondary:primary,input.name,input.prompt);
 else variants=conceptVariants(input);
 return {
  version:'1.0.0',name:typography.text,
  palette:{primary,secondary,onPrimary:textColor(primary),contrast:contrast(primary,secondary)},typography,
  variants:variants.map(v=>{
   const {width,height}=v.document;
   const fontSize=Math.min(width*.07,width*.86/Array.from(typography.text).length);
   const layers=v.document.layers.map((layer,i)=>({...layer,id:'shape-'+i}));
   layers.push({id:'brand-name',type:'text',text:typography.text,x:width/2,y:height*.85,fontSize,fill:primary});
   const document={...v.document,layers};
   return {symbol:v.symbol,document,svg:renderEditor(document)};
  })
 };
}
export function mockup(document,{surface='card',background='#ffffff'}={}){const sizes={card:[900,500],screen:[1200,800],avatar:[512,512]};if(!Object.hasOwn(sizes,surface))throw new TypeError('Unsupported surface');contrast(background,background);const svg=renderEditor(document);const [w,h]=sizes[surface];const scale=Math.min(w*.65/document.width,h*.65/document.height);const x=(w-document.width*scale)/2,y=(h-document.height*scale)/2;const body=svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${background}"/><g transform="translate(${x} ${y}) scale(${scale})">${body}</g></svg>`}
