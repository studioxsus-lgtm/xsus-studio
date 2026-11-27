import {createHash} from 'node:crypto';
import {zipStructured} from './structured-zip.mjs';
import {completeBrandPackage} from './complete-package.mjs';
import {brandIdentity} from './guidelines.mjs';
import {catalogAnimation,catalogMockup} from './catalog.mjs';
import {animatedVideo} from './video.mjs';
import {Resvg} from '@resvg/resvg-js';
const hash=b=>createHash('sha256').update(b).digest('hex');
function extract(p){const b=Buffer.from(p.bytes),out=[];let i=0;while(b.readUInt32LE(i)===0x04034b50){const size=b.readUInt32LE(i+18),n=b.readUInt16LE(i+26),e=b.readUInt16LE(i+28),name=b.toString('utf8',i+30,i+30+n),start=i+30+n+e;const bytes=b.subarray(start,start+size);if(name!=='manifest.json'){const expected=p.manifest.files.find(f=>f.name===name);if(!expected||expected.size!==bytes.length||expected.sha256!==hash(bytes))throw Error('Source archive integrity');out.push({name,bytes});}i=start+size;}return out;}
function route(n){if(n==='primary.svg')return 'vector/'+n;if(n==='primary.png')return 'raster/'+n;if(n==='source.json')return 'source/'+n;if(n.startsWith('variant-'))return 'variants/'+n;if(n.startsWith('guidelines.'))return 'guidelines/'+n;if(n.startsWith('material-'))return (/social|poster/.test(n)?'digital/':'business/')+n;if(n.startsWith('mockup-'))return 'mockup/'+n;return 'animation/'+n;}
export async function structuredBrandPackage(doc,options={}){
 const {videos=[],...rest}=options;if(!Array.isArray(videos)||videos.length>2||new Set(videos).size!==videos.length||videos.some(v=>!['mp4','webm'].includes(v)))throw TypeError('Invalid video selection');
 const p=completeBrandPackage(doc,rest),files=extract(p).map(f=>({...f,name:route(f.name)}));let total=files.reduce((s,f)=>s+f.bytes.length,0);
 const add=(name,value)=>{const bytes=Buffer.from(value);total+=bytes.length;if(total>30000000)throw RangeError('Structured package budget');files.push({name,bytes});};
 const g=brandIdentity(doc).guidelines;add('color/palette.json',JSON.stringify(g.colors));add('typography/fonts.json',JSON.stringify(g.fonts));add('licenses/NOTICE.txt','Font redistribution licenses are not bundled. Verify applicable licenses before redistribution.');add('primary/logo.svg',files.find(f=>f.name==='vector/primary.svg').bytes);
 for(const id of rest.mockups??['flat:business-card','digital:website']){const m=catalogMockup(doc,id);add('presentation/'+id.replace(':','-')+'.png',new Resvg(m.svg,{fitTo:{mode:'width',value:512}}).render().asPng());}
 for(const format of videos){const v=await animatedVideo(doc,catalogAnimation(doc,rest.animation??'fade',{duration:2}),{format,width:256,fps:8});add('animation/logo.'+format,v.bytes);}
 const manifest={...p.manifest,layout:'structured-v5',limitations:p.manifest.limitations.filter(x=>x!=='Flat archive layout'),files:files.map(f=>({name:f.name,size:f.bytes.length,sha256:hash(f.bytes)}))};add('manifest.json',JSON.stringify(manifest,null,2));return {manifest,bytes:zipStructured(files)};
}
