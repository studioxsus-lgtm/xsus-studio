import {renderEditor} from '../editor.mjs';
const vehicles={
 van:['M100 270 H600 L720 400 V560 H80 V350 Z',[160,300,340,180],[190,610]],
 truck:['M70 180 H540 V550 H70 Z M550 310 H650 L750 420 V550 H550 Z',[110,230,390,260],[170,470,670]],
 car:['M70 430 L180 400 L280 260 H520 L650 400 L740 430 V550 H70 Z',[300,420,210,100],[190,620]],
 bus:['M60 200 H740 V560 H60 Z',[160,380,480,140],[170,650]],
 trailer:['M60 180 H740 V530 H60 Z',[120,220,600,260],[560,660]],
 scooter:['M140 480 L300 480 L390 350 L570 350 L650 490 L600 550 H200 Z',[390,370,160,100],[190,620]],
 taxi:['M70 430 L180 400 L280 260 H520 L650 400 L740 430 V550 H70 Z M350 220 H450 V260 H350 Z',[300,420,210,100],[190,620]],
 train:['M60 200 H650 Q740 200 740 320 V550 H60 Z',[140,360,470,150],[180,610]]
};
const packaging={
 carton:['M220 180 L480 120 L620 220 V620 L360 680 L220 580 Z',[255,270,240,250]],
 pouch:['M240 140 H560 L590 650 Q400 700 210 650 Z',[280,260,240,280]],
 tube:['M280 120 H520 L490 590 H310 Z M310 590 H490 V680 H310 Z',[320,220,160,260]],
 sleeve:['M180 220 H620 V580 H180 Z M220 180 H580 V220 H220 Z',[240,280,320,220]],
 giftbox:['M180 280 H620 V650 H180 Z M150 200 H650 V280 H150 Z',[250,330,300,240]],
 bag:['M200 240 H600 L650 690 H150 Z M300 240 Q300 60 400 60 Q500 60 500 240',[260,320,280,280]],
 label:['M170 220 H630 V580 H170 Z M190 240 H610 V560 H190 Z',[230,280,340,240]],
 blister:['M200 100 H600 V700 H200 Z M260 300 Q400 230 540 300 V620 H260 Z',[250,130,300,140]]
};
export const vehicleTemplates=Object.freeze(Object.keys(vehicles));
export const packagingTemplates=Object.freeze(Object.keys(packaging));
function scene(doc,options,models,category){
 renderEditor(doc);const {template,color='#e5e7eb',background='#dce2e8',scale=.8}=options;
 if(!Object.hasOwn(models,template)||[color,background].some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))||!Number.isFinite(scale)||scale<.1||scale>1)throw TypeError('Invalid product parameters');
 const [path,[x,y,w,h],wheels=[]]=models[template],s=Math.min(w/doc.width,h/doc.height)*scale;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><defs><linearGradient id="product-shade"><stop stop-color="#ffffff" stop-opacity=".2"/><stop offset="1" stop-color="#000000" stop-opacity=".15"/></linearGradient><clipPath id="product-clip"><path d="'+path+'"/></clipPath></defs><rect width="800" height="800" fill="'+background+'"/><path d="'+path+'" fill="#000000" opacity=".12" transform="translate(8 12)"/><path d="'+path+'" fill="'+color+'" stroke="#374151" stroke-width="3"/><g clip-path="url(#product-clip)"><g transform="translate('+(x+(w-doc.width*s)/2)+' '+(y+(h-doc.height*s)/2)+') scale('+s+')">'+renderEditor(doc)+'</g><path d="'+path+'" fill="url(#product-shade)"/></g>'+wheels.map(cx=>'<circle cx="'+cx+'" cy="550" r="48" fill="#26313d"/><circle cx="'+cx+'" cy="550" r="22" fill="#aab4bf"/>').join('')+'</svg>';
 if(Buffer.byteLength(svg)>2000000)throw RangeError('Product output budget');
 return {version:'5.0.0',svg,width:800,height:800,source:structuredClone(doc),parameters:{template,color,background,scale},rendering:category+' schematic'};
}
export function vehicleMockup(doc,options={}){return scene(doc,{template:'van',...options},vehicles,'vehicle');}
export function packagingMockup(doc,options={}){return scene(doc,{template:'carton',...options},packaging,'packaging');}
