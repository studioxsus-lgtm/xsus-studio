import {renderEditor} from '../editor.mjs';
import {box,area} from './contours.mjs';
import {contrast} from '../design.mjs';
export function verify(paths,doc,ink,surface){
 const b=box(paths),w=b.maxX-b.minX,h=b.maxY-b.minY,occupied=area(paths);
 if(b.minX<0||b.minY<0||b.maxX>doc.width||b.maxY>doc.height||Math.min(w,h)<12)throw RangeError('mark_bounds');
 if(occupied<100||occupied>w*h*1.02)throw RangeError('mark_area');
 for(const t of doc.layers.filter(l=>l.type==='text')){
  const half=t.text.length*t.fontSize/2;
  if(t.x-half<0||t.x+half>doc.width||t.y-t.fontSize<0||t.y>doc.height)throw RangeError('wordmark_bounds');
 }
 const svg=renderEditor(doc);
 if(Buffer.byteLength(svg)>128000)throw RangeError('svg_budget');
 const contrastRatio=contrast(ink,surface);
 return {svg,quality:{bounds:b,contrast:contrastRatio,previewSurface:surface,occupancy:occupied/(w*h),points:paths.flat().length,layers:doc.layers.length}};
}
