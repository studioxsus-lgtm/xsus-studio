import {specialtyTemplates,specialtyMockup} from './specialty.mjs';
import {vehicleTemplates,vehicleMockup,packagingTemplates,packagingMockup} from './products.mjs';
import {digitalTemplates,digitalMockup} from './digital.mjs';
import {mockupTemplates,mockupScene} from './mockup.mjs';
import {cylinderTemplates,cylinderMockup} from './cylinder.mjs';
import {textileTemplates,textileMockup} from './textile.mjs';
import {extendedProfiles,extendedTimeline} from './motion-export.mjs';
import {renderEditor} from '../editor.mjs';
import {Resvg} from '@resvg/resvg-js';
const architecture={
 facade:['M100 160 H700 V650 H100 Z M130 200 H670 V420 H130 Z',[220,240,360,140]],
 reception:['M100 120 H700 V540 H100 Z M180 540 H620 V700 H180 Z',[250,220,300,200]],
 billboard:['M100 100 H700 V450 H100 Z M370 450 H430 V720 H370 Z',[150,140,500,270]],
 'window-sign':['M150 100 H650 V700 H150 Z M390 100 H410 V700 H390 Z',[200,220,180,300]],
 'door-plaque':['M180 80 H620 V720 H180 Z M230 200 H570 V400 H230 Z',[260,220,280,160]],
 'exhibition-wall':['M80 160 L680 100 V620 L80 680 Z',[200,250,350,230]],
 'street-banner':['M180 80 H210 V730 H180 Z M210 120 H570 V570 H210 Z',[250,180,280,330]],
 'wayfinding-sign':['M370 100 H430 V730 H370 Z M100 160 H600 L700 280 L600 400 H100 Z',[150,190,420,180]]
};
export const architectureTemplates=Object.freeze(Object.keys(architecture));
export function architectureMockup(doc,{template='facade',color='#d4d7db',background='#edf0f3',scale=.8}={}){
 renderEditor(doc);if(!Object.hasOwn(architecture,template)||[color,background].some(x=>typeof x!=='string'||!/^#[0-9a-f]{6}$/i.test(x))||!Number.isFinite(scale)||scale<.1||scale>1)throw TypeError('Invalid architecture parameters');
 const [path,[x,y,w,h]]=architecture[template],s=Math.min(w/doc.width,h/doc.height)*scale;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="'+background+'"/><path d="'+path+'" fill="#000000" opacity=".12" transform="translate(9 12)"/><path d="'+path+'" fill="'+color+'" stroke="#000000" stroke-opacity=".2"/><g transform="translate('+(x+(w-doc.width*s)/2)+' '+(y+(h-doc.height*s)/2)+') scale('+s+')">'+renderEditor(doc)+'</g></svg>';
 if(Buffer.byteLength(svg)>2000000)throw RangeError('Architecture budget');return {version:'5.0.0',svg,width:800,height:800,source:structuredClone(doc),parameters:{template,color,background,scale},rendering:'architectural schematic'};
}
const groups={flat:[mockupTemplates,mockupScene],cylinder:[cylinderTemplates,cylinderMockup],textile:[textileTemplates,textileMockup],architecture:[architectureTemplates,architectureMockup],digital:[digitalTemplates,digitalMockup],vehicle:[vehicleTemplates,vehicleMockup],packaging:[packagingTemplates,packagingMockup],specialty:[specialtyTemplates,specialtyMockup]};
export function brandCatalog(){return {version:'5.0.0',animation:[...extendedProfiles],mockups:Object.entries(groups).flatMap(([category,[names]])=>names.map(name=>({id:category+':'+name,category,name})))};}
export function catalogMockup(doc,id,options={}){
 if(typeof id!=='string')throw TypeError('Invalid catalog ID');const [category,name,...rest]=id.split(':');if(rest.length||!Object.hasOwn(groups,category)||!groups[category][0].includes(name))throw TypeError('Unknown catalog ID');
 return groups[category][1](doc,{...options,template:name});
}
export function catalogPNG(doc,id,options){return new Resvg(catalogMockup(doc,id,options).svg).render().asPng();}
export function catalogAnimation(doc,profile,options={}){return extendedTimeline(doc,{...options,profile});}
