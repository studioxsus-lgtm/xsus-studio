import {combine,regular,line,transform,fit,area,box} from './contours.mjs';
import {geometricHarmony} from './geometric-harmony.mjs';
export function modularSymbol(direction,seed){
 const n=3+seed%4,unit=12+seed%5,r=unit*5,thickness=unit*(1.3+(seed%3)*.2);
 const rotate=(p,a)=>transform(p,(x,y)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]);
 const mode=['signal','axis','network','flow','aperture','connection'].indexOf(direction);
 if(mode<0)throw RangeError('unknown_concept');
 const tile=mode%2===0?[[[unit,-unit],[r,-unit*2],[r-unit,unit],[unit,unit*2]]]:line([[unit,0],[r-unit,-unit*2],[r,0]],thickness);
 const copies=mode===1||mode===3?2:n;
 const parts=Array.from({length:copies},(_,i)=>rotate(tile,i*2*Math.PI/copies+(mode%3)*Math.PI/12)).flat();
 const mark=combine(parts);
 if(!mark.length)return null;
 const b=box(mark),occupancy=area(mark)/Math.max(1,(b.maxX-b.minX)*(b.maxY-b.minY));
 return occupancy>.12&&occupancy<.78&&geometricHarmony(mark).acceptable?fit(mark,218,205):null;
}
