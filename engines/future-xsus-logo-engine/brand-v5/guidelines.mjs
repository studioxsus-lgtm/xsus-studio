import {renderEditor} from '../editor.mjs';
const clone=structuredClone;
const hex=/^#[0-9a-f]{6}$/i;
export function colorSpec(value){
 if(typeof value!=='string'||!hex.test(value))throw new TypeError('Invalid color');
 const rgb=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
 const [r,g,b]=rgb.map(x=>x/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2,k=1-max;
 let h=0;if(d)h=60*(max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4);
 return {hex:value.toLowerCase(),rgb,hsl:[Math.round(h),Math.round(d?100*d/(1-Math.abs(2*l-1)):0),Math.round(l*100)],cmykApprox:[...([r,g,b].map(x=>Math.round(k===1?0:100*(1-x-k)/(1-k)))),Math.round(k*100)]};
}
function walk(layers,fn){for(const l of layers){fn(l);if(Array.isArray(l.layers))walk(l.layers,fn);if(Array.isArray(l.children))walk(l.children,fn)}}
export function brandGuidelines(document){
 renderEditor(document);
 const source=clone(document),colors=new Set(),fonts=new Set();
 walk(source.layers,l=>{for(const c of [l.fill,l.stroke])if(typeof c==='string'&&hex.test(c))colors.add(c.toLowerCase());if(l.type==='text'&&l.fontFamily)fonts.add(l.fontFamily);});
 return {version:'5.0.0',source,colors:[...colors].map(colorSpec),fonts:[...fonts],usage:{clearSpaceRecommendation:Math.min(source.width,source.height)/10,minimumSize:null,minimumSizeStatus:'requires visual proof',preserveAspectRatio:true},limitations:['Palette includes solid layer colors only','CMYK values are unprofiled approximations','Clear space is a recommendation, not a measured standard']};
}
export function brandVariant(document,kind){
 renderEditor(document);const out=clone(document);
 if(!['original','black','white'].includes(kind))throw new TypeError('Unsupported variant');
 if(kind!=='original'){const color=kind==='black'?'#000000':'#ffffff';walk(out.layers,l=>{if(typeof l.fill==='string'&&hex.test(l.fill))l.fill=color;if(typeof l.stroke==='string'&&hex.test(l.stroke))l.stroke=color;if(l.gradient)throw new Error('Gradient monochrome requires explicit conversion');});}
 renderEditor(out);return out;
}
