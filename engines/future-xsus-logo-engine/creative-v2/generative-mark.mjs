import {petal,oval} from './organic-contours.mjs';
import {precisionVector} from './precision-vector.mjs';
import {symmetryRefinement} from './symmetry-refinement.mjs';
import {meaningfulNegative} from './meaningful-negative.mjs';
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
 case 'prism':p=combine(Array.from({length:3},(_,i)=>rotate([[[0,-r],[r*.64,-r*.25],[r*.42,0],[0,-r*.48]]],i*2*Math.PI/3)).flat());break;
 case 'bridge':p=combine([...line([[-r,50],[-r,-20],[0,-r],[r,-20],[r,50]],w),...line([[-r*.45,50],[-r*.45,5],[0,-r*.35],[r*.45,5],[r*.45,50]],w*.85)]);break;
 case 'pulse':p=combine(line([[-r,0],[-r*.55,0],[-r*.25,-r*.65],[r*.15,r*.65],[r*.45,0],[r,0]],w));break;
 case 'atelier':p=combine([[[ -r,-r],[-r+w,-r],[0,r-w],[r-w,-r],[r,-r],[0,r]]]);break;
 case 'ribbon-loop':p=combine([regular(8,r,0,0,Math.PI/8)],[regular(8,r-w,0,0,Math.PI/8)],'cut');p=combine(p,line([[-r*.72,r*.72],[r*.72,-r*.72]],w*.8),'cut');break;
 case 'facet':p=combine([[[-r,0],[0,-r],[r,0],[0,r]]],[[[-r*.48,0],[0,-r*.48],[r*.48,0],[0,r*.48]]],'cut');break;
 case 'leaf-pair':p=combine([[[0,r],[-r*.85,0],[-r*.7,-r],[0,-r*.4]],[[0,r],[r*.85,0],[r*.7,-r],[0,-r*.4]]]);p=combine(p,line([[0,-r*.4],[0,r]],w*.55),'cut');break;
 case 'vector-core':p=combine([[[0,-r],[r,0],[0,r],[-r,0]]],[[[0,-r*.55],[r*.55,0],[0,r*.55],[-r*.55,0]]],'cut');p=combine(p,line([[-r,-r],[r,r]],w*.85),'cut');break;
 case 'quantum':p=combine(Array.from({length:3},(_,i)=>rotate([[[w*.4,-r],[r*.65,-r*.55],[r*.45,-r*.12],[w*.4,-r*.48]]],i*2*Math.PI/3)).flat());break;
 case 'circuit':p=combine([...line([[-r,r*.7],[-r,-r*.4],[0,-r],[r,-r*.4],[r,r*.7]],w),...line([[-r*.45,r*.7],[-r*.45,0],[0,-r*.25],[r*.45,0],[r*.45,r*.7]],w*.8)]);break;
 case 'botanical':p=combine(Array.from({length:3},(_,i)=>petal(r,w*1.35,i*2*Math.PI/3)));break;
 case 'halo':p=combine([oval(r,r*.8)],[oval(r-w,r*.8-w)],'cut');p=combine(p,line([[-r,-r],[r,r]],w*.7),'cut');break;
 case 'silk':p=combine([petal(r,w*1.8,-.65),petal(r,w*1.8,Math.PI-.65)]);break;
 default:throw RangeError('unknown_concept');
 }
 if(seed%4===0&&['signal','axis','network','flow','aperture','connection'].includes(direction)){const modular=modularSymbol(direction,seed);if(modular)p=modular;}
 p=gridRefinement(p,2);
 if(negative)p=meaningfulNegative(p,direction,seed);
 p=precisionVector(p);
 if(['axis','signal','connection'].includes(direction)){p=symmetryRefinement(p);return fit(p,218,205);}
 return fit(rotate(p,phase),218,205);
}
