import {Resvg} from '@resvg/resvg-js';
export function pixelQuality(svg,{size=96}={}){
 if(typeof svg!=='string'||Buffer.byteLength(svg)>240000||!Number.isInteger(size)||size<32||size>128)throw RangeError('quality_budget');
 // Use a bounded viewport via fit-to-width; reject extreme aspect ratios before rendering.
 const match=svg.match(/<svg\b[^>]*\bwidth="([0-9.]+)"[^>]*\bheight="([0-9.]+)"/);
 if(!match)throw Error('quality_dimensions');
 const w=Number(match[1]),h=Number(match[2]);if(!w||!h)throw Error('quality_dimensions');
 const image=new Resvg(svg,{fitTo:{mode:'width',value:Math.max(1,Math.round(size*w/Math.max(w,h)))}}).render();
 const pixels=image.pixels,width=image.width,height=image.height;
 let mass=0,mx=0,my=0,edge=0,occupied=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=pixels[(y*width+x)*4+3]/255;mass+=a;mx+=a*(x+.5);my+=a*(y+.5);if(a>=.5)occupied++;if(x===0||y===0||x===width-1||y===height-1)edge+=a;}
 const coverage=mass/(width*height),offset=mass?Math.hypot(mx/mass/width-.5,my/mass/height-.5):1;
 const warnings=[];if(coverage<.025)warnings.push('sparse_ink');if(coverage>.85)warnings.push('dense_ink');if(offset>.22)warnings.push('off_center_ink');if(edge>0)warnings.push('edge_contact');
 return {width,height,coverage,occupied,centerOffset:offset,edgeInk:edge,warnings,acceptable:mass>0&&coverage>=.005};
}
