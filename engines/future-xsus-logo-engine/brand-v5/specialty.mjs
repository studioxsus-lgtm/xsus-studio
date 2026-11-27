import {renderEditor} from '../editor.mjs';
const models={
 menu:['M180 100 H620 V700 H180 Z M210 130 H590 V670 H210 Z',[250,160,300,180]],
 placemat:['M80 200 H720 V600 H80 Z',[120,240,220,220]],
 'pizza-box':['M120 240 L570 140 L700 280 L250 380 Z M250 380 H700 V610 H250 Z',[300,400,320,170]],
 'coffee-sleeve':['M180 240 H620 L570 560 H230 Z',[270,290,260,220]],
 'food-tray':['M100 220 H700 L650 620 H150 Z M170 270 H630 V550 H170 Z',[250,310,300,200]],
 'takeaway-cup':['M240 160 H560 L510 680 H290 Z M210 120 H590 V180 H210 Z',[310,300,180,220]],
 'restaurant-check':['M240 100 H560 V680 L530 650 L500 680 L470 650 L440 680 L410 650 L380 680 L350 650 L320 680 L290 650 L240 680 Z',[280,150,240,140]],
 'napkin':['M180 180 H620 V620 H180 Z M180 180 L620 620',[250,250,180,180]],
 'hotel-key':['M170 260 H630 V540 H170 Z M210 310 H310 V360 H210 Z',[350,300,230,190]],
 'door-hanger':['M270 100 H530 V700 H270 Z M400 150 A65 65 0 1 0 400 280 A65 65 0 1 0 400 150 Z',[310,350,180,260]],
 'hotel-slipper':['M280 100 Q530 70 550 300 L500 650 Q400 750 280 650 Z',[320,210,160,200]],
 'hotel-towel':['M140 160 H660 V640 H140 Z M140 500 H660 V570 H140 Z',[240,260,320,200]],
 'luggage-tag':['M280 160 L400 80 L520 160 V680 H280 Z M380 130 H420 V180 H380 Z',[320,260,160,300]],
 'room-directory':['M150 140 H650 V660 H150 Z M390 140 H410 V660 H390 Z',[190,200,170,300]],
 'welcome-card':['M120 250 H680 V570 H120 Z M120 250 L400 170 L680 250',[220,300,360,220]],
 'soap-wrapper':['M180 270 H620 L670 400 L620 530 H180 L130 400 Z',[240,310,320,180]],
 folder:['M100 200 H320 L370 260 H700 V660 H100 Z',[220,320,360,260]],
 notebook:['M180 100 H620 V700 H180 Z M210 100 H230 V700 H210 Z',[270,200,280,360]],
 certificate:['M80 180 H720 V620 H80 Z M110 210 H690 V590 H110 Z',[300,240,200,140]],
 invoice:['M200 80 H600 V720 H200 Z M240 300 H560 V600 H240 Z',[240,130,180,120]],
 'employee-badge':['M280 180 H520 V650 H280 Z M380 120 H420 V180 H380 Z',[320,230,160,160]],
 pen:['M100 370 H650 L730 400 L650 430 H100 Z',[230,375,300,50]],
 'desk-calendar':['M150 200 H650 L700 650 H100 Z M190 260 H610 V550 H190 Z',[280,280,240,130]],
 'presentation-folder':['M80 180 H720 V620 H80 Z M400 180 V620 M100 500 H380 V600 H100 Z',[440,250,220,280]]
};
export const specialtyTemplates=Object.freeze(Object.keys(models));
export function specialtyMockup(doc,{template='menu',color='#ffffff',background='#dce2e8',scale=.8}={}){
 renderEditor(doc);if(!Object.hasOwn(models,template)||[color,background].some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))||!Number.isFinite(scale)||scale<.1||scale>1)throw TypeError('Invalid specialty parameters');
 const [path,[x,y,w,h]]=models[template],s=Math.min(w/doc.width,h/doc.height)*scale;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><defs><clipPath id="specialty"><path d="'+path+'" fill-rule="evenodd"/></clipPath></defs><rect width="800" height="800" fill="'+background+'"/><path d="'+path+'" fill="#000000" opacity=".12" transform="translate(8 12)"/><path d="'+path+'" fill="'+color+'" stroke="#64748b" stroke-width="2"/><g transform="translate('+(x+(w-doc.width*s)/2)+' '+(y+(h-doc.height*s)/2)+') scale('+s+')">'+renderEditor(doc)+'</g></svg>';
 if(Buffer.byteLength(svg)>2000000)throw RangeError('Specialty budget');return {version:'5.0.0',svg,width:800,height:800,source:structuredClone(doc),parameters:{template,color,background,scale},rendering:'specialty product schematic'};
}
