import {renderEditor} from '../editor.mjs';
import {Resvg} from '@resvg/resvg-js';
const templates={
 'business-card':{size:[1000,700],surface:[220,180,560,320],color:'#ffffff',angle:-8},
 'letterhead':{size:[900,1100],surface:[180,100,540,760],color:'#ffffff',angle:5},
 'phone-screen':{size:[800,1000],surface:[260,110,280,650],color:'#18212e',angle:0},
 'desktop-screen':{size:[1200,800],surface:[160,120,880,500],color:'#18212e',angle:0},
 'store-sign':{size:[1200,800],surface:[150,160,900,300],color:'#e4e1da',angle:0},
 'product-box':{size:[1000,900],surface:[300,180,400,480],color:'#d6c3a5',angle:-8},
 'book-cover':{size:[900,1000],surface:[220,140,460,700],color:'#e9e4da',angle:8},
 'tote-print':{size:[1000,900],surface:[260,250,480,450],color:'#e6d9bf',angle:0}
};
export const mockupTemplates=Object.freeze(Object.keys(templates));
const hex=/^#[0-9a-f]{6}$/i;
const finite=(v,min,max)=>{if(!Number.isFinite(v)||v<min||v>max)throw RangeError('Invalid mockup parameter');return v;};
export function mockupScene(doc,{template='business-card',background='#dce2e8',surfaceColor,scale=.65,rotation=0,offsetX=0,offsetY=0}={}){
 renderEditor(doc);if(!Object.hasOwn(templates,template))throw TypeError('Unknown mockup template');
 const t=templates[template],[width,height]=t.size,[x,y,w,h]=t.surface;
 const fill=surfaceColor??t.color;if(typeof fill!=='string'||!hex.test(fill)||typeof background!=='string'||!hex.test(background))throw TypeError('Invalid mockup color');
 finite(scale,.05,.95);finite(rotation,-45,45);finite(offsetX,-.2,.2);finite(offsetY,-.2,.2);
 const angle=(t.angle+rotation)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),cx=x+w/2,cy=y+h/2;
 const fit=Math.min(w/doc.width,h/doc.height)*scale;
 const dx=cx-doc.width*fit/2+w*offsetX,dy=cy-doc.height*fit/2+h*offsetY;
 const svg=renderEditor(doc).replace(/\bid="art-/g,'id="mock-art-').replace(/url\(#art-/g,'url(#mock-art-');
 const matrix=[c,s,-s,c,cx-c*cx+s*cy,cy-s*cx-c*cy];
 const output='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><defs><clipPath id="surface-clip"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8"/></clipPath></defs><rect width="'+width+'" height="'+height+'" fill="'+background+'"/><g transform="matrix('+matrix.join(' ')+')"><rect x="'+(x+12)+'" y="'+(y+16)+'" width="'+w+'" height="'+h+'" rx="8" fill="#000000" opacity=".14"/><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="'+fill+'"/><g clip-path="url(#surface-clip)"><g transform="translate('+dx+' '+dy+') scale('+fit+')">'+svg+'</g></g></g></svg>';
 if(Buffer.byteLength(output)>2000000)throw RangeError('Mockup SVG budget');
 return {version:'5.0.0',template,width,height,source:structuredClone(doc),parameters:{background,surfaceColor:fill,scale,rotation,offsetX,offsetY},svg:output,rendering:'flat affine surface illustration; not photorealistic'};
}
export function mockupPNG(doc,options){const scene=mockupScene(doc,options);return new Resvg(scene.svg).render().asPng();}
