import {combine,area,box,regular,line} from './contours.mjs';
import {geometricHarmony} from './geometric-harmony.mjs';
export function meaningfulNegative(paths,direction,seed=0){
 const b=box(paths),cx=(b.minX+b.maxX)/2,cy=(b.minY+b.maxY)/2,s=Math.min(b.maxX-b.minX,b.maxY-b.minY),total=area(paths);
 if(!total||!s)return paths;
 const base=geometricHarmony(paths);let best=paths,score=-Infinity;
 for(const k of [.07,.10,.13]){
 const r=s*k;
 const mask=direction==='axis'||direction==='signal'?[[[cx,cy-r],[cx+r,cy+r],[cx-r,cy+r]]]:direction==='flow'||direction==='connection'?line([[cx-r,cy+r],[cx+r,cy-r]],r*.65):[regular(direction==='network'?6:4,r,cx,cy,Math.PI/4)];
 const p=combine(paths,mask,'cut'),ratio=area(p)/total;
 if(ratio<.85||ratio>.985||p.length>paths.length+2)continue;
 const q=geometricHarmony(p);
 if(!q.acceptable||q.tiny>base.tiny||q.score<base.score-.12)continue;
 const value=q.score-Math.abs(ratio-.93);
 if(value>score){best=p;score=value;}
 }
 return best;
}
