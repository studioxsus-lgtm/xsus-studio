import {similarity,transform} from './contours.mjs';
export function diversityCheck(signature,previous,{architecture=null,attempt=0}={}){
 const same=architecture!==null&&previous.some(p=>p.architecture===architecture);
 if(same&&attempt<5&&new Set(previous.map(p=>p.architecture)).size<8)return false;
 const limit=architecture&&attempt<7?.86:.94;
 for(const p of previous){
 if(similarity(signature,p.signature)>limit)return false;
 if(architecture&&attempt<7&&similarity(signature,transform(p.signature,(x,y)=>[-x,y]))>.90)return false;
 }
 return true;
}
