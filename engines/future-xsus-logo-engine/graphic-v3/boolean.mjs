import C from 'clipper-lib';
import {combine,integerPaths,points,line} from '../creative-v2/contours.mjs';

export const operations=['union','difference','intersection','exclusion','xor','divide','trim','merge','crop','compound','offset','inset','outline','simplify','deduplicate'];
export function booleanPaths(operation,a,b=[],distance=2){
 if(!operations.includes(operation)||!Number.isFinite(distance)||distance<=0||distance>256)throw RangeError('invalid_boolean');
 // Conversion checks finite coordinates, ring count and the input point budget.
 const input=integerPaths(a);integerPaths(b);
 switch(operation){
 case 'divide':return [combine(a,b,'cut'),combine(a,b,'intersect'),combine(b,a,'cut')].filter(part=>part.length);
 case 'compound':return [C.Clipper.SimplifyPolygons(integerPaths([...a,...b]),C.PolyFillType.pftEvenOdd)].map(points);
 case 'simplify':return [points(C.Clipper.SimplifyPolygons(input,C.PolyFillType.pftNonZero))];
 case 'deduplicate':return [a.map(r=>r.filter((p,i)=>p[0]!==r[(i+r.length-1)%r.length][0]||p[1]!==r[(i+r.length-1)%r.length][1])).filter(r=>r.length>=3)];
 case 'offset':case 'inset':{
  const offset=new C.ClipperOffset(2,4),result=[];
  offset.AddPaths(integerPaths(combine(a)),C.JoinType.jtRound,C.EndType.etClosedPolygon);
  offset.Execute(result,(operation==='inset'?-1:1)*64*distance);return [points(result)];
 }
 case 'outline':return [combine(a.flatMap(r=>line([...r,r[0]],distance)))];
 default:{
  const kind={difference:'cut',trim:'cut',crop:'intersect',intersection:'intersect',xor:'xor',exclusion:'xor'};
  return [combine(a,b,kind[operation]??'union')];
 }
 }
}
