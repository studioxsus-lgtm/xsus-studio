import {Resvg} from '@resvg/resvg-js';
export function visualEvidence(svg,colors=[]){
 if(typeof svg!=='string'||Buffer.byteLength(svg)>240000||colors.length>2||colors.some(c=>!/^#[0-9a-f]{6}$/i.test(c)))throw RangeError('visual_budget');
 const m=svg.match(/<svg\b[^>]*\bwidth="([0-9.]+)"[^>]*\bheight="([0-9.]+)"/);
 if(!m||Number(m[1])<32||Number(m[2])<32||Number(m[1])>4096||Number(m[2])>4096)throw RangeError('visual_dimensions');
 const image=new Resvg(svg,{fitTo:{mode:'width',value:Math.max(1,Math.round(128*Number(m[1])/Math.max(Number(m[1]),Number(m[2]))))}}).render();
 const pixels=image.pixels,targets=colors.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16))),counts=targets.map(()=>0);
 let opaque=0;
 for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<240)continue;opaque++;targets.forEach((t,j)=>{if(Math.hypot(pixels[i]-t[0],pixels[i+1]-t[1],pixels[i+2]-t[2])<=18)counts[j]++;});}
 const palette=colors.map((color,i)=>({color,pixels:counts[i],share:counts[i]/Math.max(1,opaque),visible:counts[i]>=Math.max(3,opaque*.01)}));
 return {width:image.width,height:image.height,opaque,palette,acceptable:opaque>0&&palette.every(c=>c.visible),method:'raster-rgb-evidence'};
}
