import {animatedPNG} from './apng.mjs';
import {createHash} from 'node:crypto';
import {renderEditor} from '../editor.mjs';
import {zipBrand} from '../zip.mjs';
import {brandManual,manualHTML,brandMaterial,materialFormats} from './materials.mjs';
import {catalogMockup,catalogAnimation} from './catalog.mjs';
import {animatedSVG} from './motion-export.mjs';
import {Resvg} from '@resvg/resvg-js';
export function completeBrandPackage(doc,{name,language='en',mockups=['flat:business-card','digital:website'],animation='fade',includeAPNG=false}={}){
 const manual=brandManual(doc,{name,language});
 if(!Array.isArray(mockups)||mockups.length>4||new Set(mockups).size!==mockups.length)throw TypeError('Invalid mockup selection');
 const files=[];let total=0;
 const add=(name,value)=>{const bytes=typeof value==='string'?Buffer.from(value):Buffer.from(value);total+=bytes.length;if(total>30000000)throw RangeError('Brand package budget');files.push({name,bytes});};
 const svg=renderEditor(doc);add('primary.svg',svg);add('source.json',JSON.stringify(doc));add('primary.png',new Resvg(svg,{fitTo:{mode:'width',value:1024}}).render().asPng());
 add('guidelines.html',manualHTML(doc,{name,language}));add('guidelines.json',JSON.stringify(manual));
 for(const v of manual.identity.variants)add('variant-'+v.kind+'.svg',renderEditor(v.document));
 for(const kind of Object.keys(materialFormats))add('material-'+kind+'.svg',renderEditor(brandMaterial(doc,{kind,name})));
 for(const id of mockups){const m=catalogMockup(doc,id);add('mockup-'+id.replace(':','-')+'.svg',m.svg);}
 const timeline=catalogAnimation(doc,animation,{duration:2});add('timeline.json',JSON.stringify(timeline));add('animation.svg',animatedSVG(doc,timeline,{fps:8}));
 if(typeof includeAPNG!=='boolean')throw TypeError('Invalid APNG selection');if(includeAPNG)add('animation.png',animatedPNG(doc,timeline,{width:256,fps:8}));
 const manifest={version:'5.0.0',name:manual.name,language,limitations:['Flat archive layout','HTML guidelines, not PDF','Illustrative mockups','Font redistribution licenses not included'],files:files.map(f=>({name:f.name,size:f.bytes.length,sha256:createHash('sha256').update(f.bytes).digest('hex')}))};
 add('manifest.json',JSON.stringify(manifest,null,2));return {manifest,bytes:zipBrand(files)};
}
