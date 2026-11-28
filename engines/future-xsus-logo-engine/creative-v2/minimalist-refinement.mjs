import {combine,area,similarity,box} from './contours.mjs';
const count=p=>p.reduce((n,r)=>n+r.length,0);
function distance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function simplify(r,tolerance){const out=r.map(p=>[...p]);for(let i=out.length-1;i>=0&&out.length>3;i--){if(distance(out[i],out[(i+out.length-1)%out.length],out[(i+1)%out.length])<=tolerance)out.splice(i,1);}return out;}
export function minimalistRefinement(paths){
 const before=count(paths),total=area(paths);if(!total||before>4096)return {paths,before,after:before,accepted:false};
 const b=box(paths),span=Math.min(b.maxX-b.minX,b.maxY-b.minY);
 let best=paths;
 for(const tolerance of [.003,.006,.009].map(v=>v*span)){
 const candidate=combine(paths.map(r=>simplify(r,tolerance)));
 if(candidate.length!==paths.length||count(candidate)>=count(best))continue;
 if(Math.abs(area(candidate)/total-1)>.015||similarity(paths,candidate)<.985)continue;
 best=candidate;
 }
 return {paths:best,before,after:count(best),accepted:best!==paths};
}
