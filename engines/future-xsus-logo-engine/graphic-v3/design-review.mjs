import {flatten,combine,area,box} from '../creative-v2/contours.mjs';
export function designReview(document,geometry,artistic){
 const warnings=new Set(geometry.heuristics?.review??[]);
 const paths=document.layers.filter(l=>l.type==='path');
 let microContours=0;
 if(paths.length&&!paths.some(l=>l.hollow||l.strokeWidth)){
 const rings=combine(paths.flatMap(l=>flatten(l.commands))),total=area(rings);
 if(total>0){const b=box(rings),span=Math.min(b.maxX-b.minX,b.maxY-b.minY);
 microContours=rings.filter(r=>{const b=box([r]);return area([r])<total*.0015||Math.min(b.maxX-b.minX,b.maxY-b.minY)<span*.012;}).length;}
 }
 if(microContours)warnings.add('micro_contours');
 if(artistic.scaleStable===false)warnings.add('unstable_raster_coverage');
 if(artistic.smallScale===false)warnings.add('small_scale_failure');
 const critical=['micro_contours','unstable_raster_coverage','small_scale_failure','overlapping_text_bounds'];
 return {method:'final-vector-and-raster-review',microContours,warnings:[...warnings],recommended:!critical.some(k=>warnings.has(k))};
}
