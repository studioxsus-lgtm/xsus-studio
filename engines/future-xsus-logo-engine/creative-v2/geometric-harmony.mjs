import {area,box,fit,transform,similarity} from './contours.mjs';
export function geometricHarmony(paths){
 const b=box(paths),w=b.maxX-b.minX,h=b.maxY-b.minY,total=area(paths);
 if(!total||w<=0||h<=0)return {acceptable:false,score:0};
 const normalized=fit(paths,200,200),mirror=similarity(normalized,transform(normalized,(x,y)=>[-x,y]));
 const tiny=paths.filter(r=>area([r])<total*.008).length;
 const proportion=Math.min(w,h)/Math.max(w,h);
 const score=.45*mirror+.35*proportion+.20*(1-Math.min(1,tiny/3));
 return {acceptable:tiny<=2&&proportion>=.35,score,mirror,proportion,tiny};
}
export function preferHarmoniousFusion(base,fused){
 if(!fused)return false;
 const a=geometricHarmony(base),b=geometricHarmony(fused);
 return b.acceptable&&b.score>=a.score-.12&&b.tiny<=a.tiny;
}
