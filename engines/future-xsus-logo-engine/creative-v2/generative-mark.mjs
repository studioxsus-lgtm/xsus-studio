import {gridRefinement} from './grid-refinement.mjs';
import {modularSymbol} from './modular-symbol.mjs';
import {combine,regular,line,transform,fit,area} from './contours.mjs';
export function generativeMark(direction,seed=0,negative=false){
 const n=3+seed%3,r=82+seed%13,w=19+seed%9,phase=(seed%9-4)*.025;
 const rotate=(p,a)=>transform(p,(x,y)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]);
 let p;
 switch(direction){
 case 'signal':p=combine(Array.from({length:3},(_,i)=>line([[-r+i*22,48-i*35],[0,-r+i*35],[r-i*22,48-i*35]],w)).flat());break;
 case 'axis':p=combine([...line([[-r,r],[0,-r],[r,r]],w),...line([[-r*.45,22],[r*.45,22]],w*.8)]);break;
 case 'network':p=combine(Array.from({length:n},(_,i)=>rotate(line([[25,-15],[r,-35],[r,15]],w),i*2*Math.PI/n)).flat());break;
 case 'flow':p=combine(Array.from({length:2},(_,i)=>rotate(line([[-r,35],[-25,-35],[25,35],[r,-35]],w),i*Math.PI)).flat());break;
 case 'aperture':p=combine(Array.from({length:n+1},(_,i)=>rotate([[[25,-18],[r,-35],[r*.8,25],[30,40]]],i*2*Math.PI/(n+1))).flat());break;
 case 'connection':p=combine([...line([[-r,-r*.55],[0,r*.55],[r,-r*.55]],w),...line([[-r,r*.55],[0,-r*.55],[r,r*.55]],w)]);break;
 default:throw RangeError('unknown_concept');
 }
 if(seed%4===0){const modular=modularSymbol(direction,seed);if(modular)p=modular;}
 p=gridRefinement(p,2);
 if(negative){const cut=combine(p,[regular(4,17+seed%8,0,0,phase)],'cut');if(area(cut)>=area(p)*.8&&area(cut)<area(p))p=cut;}
 return fit(rotate(p,phase),218,205);
}
