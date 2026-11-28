import {combine,line,fit,area,transform} from './contours.mjs';
import {architecturalMark} from './architecture.mjs';
export function negativeArchitecture(index,seed=0){
 const base=architecturalMark(index,seed),angle=(seed%13-6)*.035;
 const rotate=(x,y)=>[x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle)];
 const cuts=[ [[-120,28],[-18,28],[20,-28],[120,-28]], [[-110,-65],[-24,0],[24,0],[110,65]], [[-110,0],[-35,0],[0,-35],[35,0],[110,0]] ];
 const channel=transform(line(cuts[index%cuts.length],8+seed%5),rotate);
 const carved=combine(base,channel,'cut');
 const ratio=area(carved)/area(base);
 return fit(carved.length&&ratio>.65&&ratio<.995?carved:base,218,205);
}
