export function createProjectManager({client}={}){
 if(!client||['generate','list','get','download'].some(k=>typeof client[k]!=='function'))throw TypeError('Invalid client');
 let epoch=0,busy=false,projects=[],selected=null,error=null;
 const listeners=new Set();
 const snapshot=()=>structuredClone({busy,projects,selected,error});
 function notify(){for(const fn of listeners)try{fn(snapshot())}catch{}}
 function validateList(value){if(!Array.isArray(value)||value.length>1000||value.some(x=>!x||typeof x.id!=='string'))throw Error('Invalid project history');return structuredClone(value)}
 async function run(work){if(busy)throw Error('Operation in progress');const current=epoch;busy=true;error=null;notify();try{const result=await work();if(current!==epoch)throw Error('Session changed');return result.apply()}catch(e){if(current===epoch)error='Project operation failed';throw e}finally{if(current===epoch){busy=false;notify()}}}
 return Object.freeze({
 snapshot,
 subscribe(fn){if(typeof fn!=='function'||listeners.size>=100)throw TypeError('Invalid subscriber');listeners.add(fn);return ()=>listeners.delete(fn)},
 reset(){epoch++;busy=false;projects=[];selected=null;error=null;notify()},
 refresh(){return run(async()=>{const next=validateList(await client.list());return {apply(){projects=next;if(selected&&!projects.some(p=>p.id===selected.id))selected=null;return snapshot()}}})},
 generate(input){return run(async()=>{const result=await client.generate(input);if(!result?.job||typeof result.job.id!=='string'||result.job.status!=='completed')throw Error('Invalid generation result');const job=structuredClone(result.job);return {apply(){projects=[job,...projects.filter(p=>p.id!==job.id)];selected=job;return snapshot()}}})},
 select(id){return run(async()=>{const job=await client.get(id);if(!job||job.id!==id)throw Error('Invalid project');return {apply(){selected=structuredClone(job);return snapshot()}}})},
 download(id){return run(async()=>{const blob=await client.download(id);return {apply:()=>blob}})}
 });
}
