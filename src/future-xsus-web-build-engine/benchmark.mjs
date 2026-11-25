import {generateUnifiedProject} from './pipeline.mjs';
import {buildArchive} from './build.mjs';
import {performance} from 'node:perf_hooks';
export function benchmarkWebsite({pageCount=10,iterations=5,clock=()=>performance.now(),memory=()=>process.memoryUsage().rss}={}){
 if(!Number.isInteger(pageCount)||pageCount<1||pageCount>100||!Number.isInteger(iterations)||iterations<1||iterations>30)throw TypeError('Invalid benchmark configuration');
 const spec={name:'Benchmark',pages:Array.from({length:pageCount},(_,i)=>({path:i===0?'index.html':'page-'+i+'.html',title:'Page '+i,sections:[{kind:'hero',title:'Welcome'},{kind:'features',title:'Features',items:[{title:'Feature',body:'Example'}]}]}))};
 const generation=[],packaging=[];let bytes=0,fileCount=0;const initialRss=memory();let peakSampledRss=initialRss;
 for(let i=0;i<iterations;i++){let start=clock();const project=generateUnifiedProject(spec);generation.push(Math.max(0,clock()-start));start=clock();const archive=buildArchive(project);packaging.push(Math.max(0,clock()-start));bytes=archive.archive.length;fileCount=archive.fileCount;peakSampledRss=Math.max(peakSampledRss,memory())}
 const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return {meanMs:values.reduce((a,b)=>a+b,0)/values.length,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1)}};
 return {pageCount,iterations,fileCount,archiveBytes:bytes,generation:stats(generation),packaging:stats(packaging),initialRss,peakSampledRss,publicationAuthorized:false};
}
