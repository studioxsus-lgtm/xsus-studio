import {advancedSymbol} from '../advanced.mjs';
import {regular,combine,line,flatten} from './contours.mjs';
export const families=['organic','radial','polygon','spiral','fractal','modular','network'];
export function random(seed){let v=seed>>>0;return ()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296}}
export function procedure(family,seed,detail){
 if(!families.includes(family)||![1,2,3].includes(detail))throw RangeError('invalid_procedure');
 const rng=random(seed),n=3+detail+Math.floor(rng()*3),phase=rng()*.7,amplitude=15+rng()*20;
 if(family==='polygon')return combine([regular(n,100)],[regular(n,50+amplitude,8,0,phase)],'cut');
 if(family==='radial')return [regular(2*n,100).map((p,i)=>p.map(v=>i%2?v*(.38+amplitude/100):v))];
 if(family==='organic'){
  const pts=regular(n,80).map((p,i)=>p.map(v=>v*(1+.29*Math.cos(i*2+phase))));
  const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
  return flatten([['M',...mid(pts.at(-1),pts[0])],...pts.map((p,i)=>['Q',...p,...mid(p,pts[(i+1)%n])]),['Z']]);
 }
 if(family==='spiral')return advancedSymbol({kind:'spiral',count:n*2,size:256}).document.layers.map(d=>regular(12,d.r,d.cx-128,d.cy-128));
 if(family==='fractal'){
  const paths=[];const angle=.4+phase/2;
  function branch(p,a,len,d){const end=[p[0]+Math.cos(a)*len,p[1]+Math.sin(a)*len];paths.push(...line([p,end],d*4+3));if(d){branch(end,a-angle,len*.7,d-1);branch(end,a+angle,len*.7,d-1)}}
  branch([0,90],-Math.PI/2,65,detail);return combine(paths);
 }
 const nodes=regular(n,80,0,0,phase);
 if(family==='modular')return nodes.map(([x,y],i)=>regular(4,amplitude,x,y,i*.14));
 return combine([...nodes.flatMap((p,i)=>line([p,nodes[(i+2)%n]],6)),...nodes.map(([x,y])=>regular(12,10,x,y))]);
}
