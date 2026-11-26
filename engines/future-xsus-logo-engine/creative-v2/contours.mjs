import C from 'clipper-lib';
import {polygon,bounds} from '../geometry.mjs';
const scale=64;
export const regular=(n,r,x=0,y=0,angle=-Math.PI/2)=>polygon(x,y,r,n,angle);
export const transform=(paths,fn)=>paths.map(r=>r.map(([x,y])=>fn(x,y)));
export function box(paths){return bounds(paths.flat())}
export function fit(paths,w,h,cx=0,cy=0){
 const b=box(paths),s=Math.min(w/Math.max(.01,b.maxX-b.minX),h/Math.max(.01,b.maxY-b.minY));
 return transform(paths,(x,y)=>[cx+(x-(b.minX+b.maxX)/2)*s,cy+(y-(b.minY+b.maxY)/2)*s]);
}
function integerPaths(paths){
 if(paths.length>256||paths.reduce((n,r)=>n+r.length,0)>4096)throw RangeError('contour_budget');
 return paths.map(r=>r.map(([x,y])=>{
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.max(Math.abs(x),Math.abs(y))>4096)throw RangeError('invalid_coordinate');
  return {X:Math.round(x*scale),Y:Math.round(y*scale)};
 }));
}
const points=paths=>paths.map(r=>C.Clipper.CleanPolygon(r,.28*scale)).filter(r=>r.length>=3).map(r=>r.map(p=>[p.X/scale,p.Y/scale]));
export function combine(a,b=[],operation='union'){
 const op={union:C.ClipType.ctUnion,cut:C.ClipType.ctDifference,intersect:C.ClipType.ctIntersection}[operation];
 if(op===undefined)throw TypeError('invalid_operation');
 const c=new C.Clipper(),out=[];
 c.AddPaths(integerPaths(a),C.PolyType.ptSubject,true);
 c.AddPaths(integerPaths(b),C.PolyType.ptClip,true);
 c.Execute(op,out,C.PolyFillType.pftNonZero,C.PolyFillType.pftNonZero);
 return points(out);
}
export function line(vertices,width){
 const offset=new C.ClipperOffset(2,30),out=[];
 offset.AddPaths(integerPaths([vertices]),C.JoinType.jtRound,C.EndType.etOpenRound);
 offset.Execute(out,width*scale/2);return points(out);
}
export function flatten(commands){
 const out=[];let ring=[],last;
 for(const [op,...v] of commands){
  if(op==='M'||op==='Z'){if(ring.length>2)out.push(ring);ring=op==='M'?[v]:[];last=v;continue}
  if(op==='L'){ring.push(v);last=v;continue}
  if(!['Q','C'].includes(op))throw TypeError('unsupported_curve');
  const controls=[last,...Array.from({length:v.length/2},(_,i)=>v.slice(i*2,i*2+2))];
  for(let i=1;i<=7;i++){let p=controls;const t=i/7;
   while(p.length>1)p=p.slice(1).map((b,j)=>b.map((val,k)=>p[j][k]*(1-t)+val*t));
   ring.push(p[0]);
  }last=controls.at(-1);
 }
 if(ring.length>2)out.push(ring);return out;
}
export function layer(id,paths,fill){
 const commands=paths.flatMap(r=>[...r.map((p,i)=>[i?'L':'M',...p.map(n=>Math.round(n*100)/100)]),['Z']]);
 if(commands.length<4||commands.length>512)throw RangeError('path_budget');
 return {id,type:'path',commands,fill};
}
export const area=paths=>Math.abs(paths.reduce((sum,r)=>sum+r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1]},0)/2,0));
export function similarity(a,b){const both=area(combine(a,b,'intersect'));return both/Math.max(1,area(a)+area(b)-both)}
