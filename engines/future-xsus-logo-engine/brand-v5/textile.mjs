import {renderEditor} from '../editor.mjs';
import {Resvg} from '@resvg/resvg-js';
const models={
 tshirt:{path:'M250 160 L340 120 Q400 200 460 120 L550 160 L650 260 L560 340 L520 300 V680 H280 V300 L240 340 L150 260 Z',area:[310,300,180,210]},
 hoodie:{path:'M310 170 Q300 60 400 60 Q500 60 490 170 L570 200 L650 610 L550 640 L520 350 V700 H280 V350 L250 640 L150 610 L230 200 Z',area:[310,290,180,170]},
 cap:{path:'M180 420 Q180 190 400 190 Q620 190 620 420 Q720 470 650 500 H220 Z',area:[300,270,200,130]},
 apron:{path:'M340 100 H460 L490 260 L570 310 V720 H230 V310 L310 260 Z',area:[300,330,200,220]},
 flag:{path:'M180 160 Q300 100 420 160 T660 160 V540 Q540 600 420 540 T180 540 Z',area:[260,230,320,230]},
 cushion:{path:'M200 180 Q400 220 600 180 Q560 400 600 620 Q400 580 200 620 Q240 400 200 180 Z',area:[280,280,240,240]},
 patch:{path:'M400 160 L620 250 V440 Q600 600 400 680 Q200 600 180 440 V250 Z',area:[280,280,240,240]},
 scarf:{path:'M270 100 H530 V700 L510 680 L490 700 L470 680 L450 700 L430 680 L410 700 L390 680 L370 700 L350 680 L330 700 L310 680 L290 700 L270 680 Z',area:[300,250,200,300]}
};
export const textileTemplates=Object.freeze(Object.keys(models));
export function textileMockup(doc,{template='tshirt',color='#e5e7eb',background='#dce2e8',texture=.25,scale=.85}={}){
 renderEditor(doc);if(!Object.hasOwn(models,template)||[color,background].some(x=>typeof x!=='string'||!/^#[0-9a-f]{6}$/i.test(x))||!Number.isFinite(texture)||texture<0||texture>1||!Number.isFinite(scale)||scale<.1||scale>1)throw TypeError('Invalid textile parameters');
 const {path,area:[x,y,w,h]}=models[template],s=Math.min(w/doc.width,h/doc.height)*scale,dx=x+(w-doc.width*s)/2,dy=y+(h-doc.height*s)/2;
 const logo=renderEditor(doc).replace(/\bid="art-/g,'id="textile-art-').replace(/url\(#art-/g,'url(#textile-art-');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><defs><clipPath id="fabric"><path d="'+path+'"/></clipPath><pattern id="weave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0 H6 M0 3 H6 M0 0 V6 M3 0 V6" stroke="#000000" stroke-width=".5" opacity="'+texture*.25+'"/></pattern><linearGradient id="fold"><stop stop-color="#000000" stop-opacity=".12"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".12"/><stop offset="1" stop-color="#000000" stop-opacity=".15"/></linearGradient></defs><rect width="800" height="800" fill="'+background+'"/><path d="'+path+'" fill="#000000" opacity=".12" transform="translate(8 12)"/><path d="'+path+'" fill="'+color+'" stroke="#000000" stroke-opacity=".15"/><g clip-path="url(#fabric)"><g transform="translate('+dx+' '+dy+') scale('+s+')">'+logo+'</g><path d="'+path+'" fill="url(#weave)"/><path d="'+path+'" fill="url(#fold)"/></g></svg>';
 if(Buffer.byteLength(svg)>2000000)throw RangeError('Textile output budget');return {version:'5.0.0',svg,width:800,height:800,source:structuredClone(doc),parameters:{template,color,background,texture,scale},rendering:'illustrative textile silhouette and weave overlay'};
}
export function textilePNG(doc,options){return new Resvg(textileMockup(doc,options).svg).render().asPng();}
