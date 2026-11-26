import {performance} from 'node:perf_hooks';
import {composeCreative} from '../creative-v2/compose.mjs';
import {enhance} from './professional.mjs';
const elapsed=[];let maxBytes=0;
for(let seed=0;seed<20;seed++){
 const start=performance.now(),{kit}=await composeCreative({prompt:'Generate a logo for "AXION" with letter A and a neural network',creative:{version:'2.0.0',seed,count:12},language:'en',brief:{name:'AXION'},strategy:{approved:true}});
 const result=enhance(kit,{styles:['futuristic','geometric'],finish:'metallic',slogan:'Intelligence in motion'});
 elapsed.push(performance.now()-start);maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(result.variants.map(v=>v.document))));
}
elapsed.sort((a,b)=>a-b);console.log(JSON.stringify({batches:20,conceptsPerBatch:12,p50Ms:elapsed[9],p95Ms:elapsed[18],peakRssKiB:process.resourceUsage().maxRSS,maxGalleryBytes:maxBytes}));
