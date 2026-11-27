import {regular,combine,line,transform,fit,area,box} from './contours.mjs';
export const architectures=['interlock','aperture','orbit','chevron','lattice','crown','ribbon','compass'];
export function architecturalMark(index,seed=0){const mode=architectures[index%architectures.length],phase=(seed%17)*.012;const ring=(n,r,w,x=0,y=0,a=0)=>combine([regular(n,r,x,y,a)],[regular(n,r-w,x,y,a)],'cut');let p;
switch(mode){
case 'interlock':p=combine(ring(6,76,19,-34,0,phase),ring(6,76,19,34,0,phase));break;
case 'aperture':p=combine(Array.from({length:6},(_,i)=>transform([[[24,-24],[98,-36],[73,22],[37,49]]],(x,y)=>[x*Math.cos(i*Math.PI/3+phase)-y*Math.sin(i*Math.PI/3+phase),x*Math.sin(i*Math.PI/3+phase)+y*Math.cos(i*Math.PI/3+phase)])).flat());break;
case 'orbit':p=combine(ring(32,94,12),[regular(4,38,0,0,phase),regular(12,13,67,-67)]);break;
case 'chevron':p=combine([...line([[-91,55],[0,-72],[91,55]],22),...line([[-48,69],[0,2],[48,69]],16)]);break;
case 'lattice':p=combine([...line([[-75,-75],[75,75]],17),...line([[-75,75],[75,-75]],17),...ring(4,100,14,0,0,Math.PI/4)]);break;
case 'crown':p=combine([...line([[-92,45],[-78,-42],[-32,2],[0,-75],[32,2],[78,-42],[92,45],[-92,45]],15),...line([[-75,70],[75,70]],12)]);break;
case 'ribbon':p=combine(ring(6,95,20,0,0,phase),line([[-60,40],[0,-40],[60,40]],18));break;
case 'compass':p=combine([regular(4,104,0,0,phase)], [regular(4,53,0,0,phase)],'cut');p=combine(p,[regular(4,29,0,0,phase+Math.PI/4)]);break;
}return fit(p,218,205);}
export function structuralQuality(paths){const b=box(paths),occupancy=area(paths)/((b.maxX-b.minX)*(b.maxY-b.minY));return {occupancy,contours:paths.length,points:paths.flat().length,acceptable:paths.length>1&&occupancy>.08&&occupancy<.82};}
