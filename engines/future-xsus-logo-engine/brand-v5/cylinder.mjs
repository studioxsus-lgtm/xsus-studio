import {renderEditor} from '../editor.mjs';
import {Resvg} from '@resvg/resvg-js';
const models={
 mug:[300,340,150,0.65,'#ffffff'],bottle:[190,520,95,.65,'#dce8ed'],can:[240,380,120,.8,'#c7cbd0'],tumbler:[230,450,115,.75,'#253342'],jar:[300,300,150,.7,'#e1c9a0'],thermos:[200,540,100,.7,'#39495a'],cosmetic:[160,380,80,.65,'#e8c5cb'],candle:[280,300,140,.65,'#f3e5ce']
};
const materials={matte:[.16,.08],metal:[.38,.36],gloss:[.24,.45],paper:[.12,.03],glass:[.3,.28]};
export const cylinderTemplates=Object.freeze(Object.keys(models));
export const surfaceMaterials=Object.freeze(Object.keys(materials));
const bounded=(v,a,b)=>{if(!Number.isFinite(v)||v<a||v>b)throw RangeError('Invalid surface parameter');return v;};
export function cylinderCoordinate(u,r,arc){bounded(u,0,1);bounded(r,1,1000);bounded(arc,.1,1.45);return r*Math.sin((2*u-1)*arc);}
export function cylinderMockup(doc,{template='mug',material='matte',color,background='#e8edf2',arc=1.1,scale=.8,light=1,strips=48}={}){
 renderEditor(doc);
 if(!Object.hasOwn(models,template)||!Object.hasOwn(materials,material))throw TypeError('Unknown cylinder or material');
 const [w,h,r,coverage,defaultColor]=models[template];color??=defaultColor;
 if([color,background].some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c)))throw TypeError('Invalid color');
 bounded(arc,.1,1.45);bounded(scale,.1,1);bounded(light,0,1);if(!Number.isInteger(strips)||strips<8||strips>96)throw RangeError('Strip budget');
 const [shade,shine]=materials[material],cx=400,y=120+(540-h)/2,cy=y+h/2;
 const fit=Math.min(w*coverage/doc.width,h*.55/doc.height)*scale,sw=Math.max(1,Math.round(doc.width*fit)),sh=Math.max(1,Math.round(doc.height*fit));
 const raw=new Resvg(renderEditor(doc),{fitTo:{mode:'width',value:sw}}).render().asPng(),uri='data:image/png;base64,'+Buffer.from(raw).toString('base64');
 const radius=sw/(2*Math.sin(arc)),defs=['<image id="logo" width="1" height="1" preserveAspectRatio="none" href="'+uri+'"/>','<linearGradient id="shade"><stop stop-color="#000000" stop-opacity="'+shade*light+'"/><stop offset=".35" stop-color="#ffffff" stop-opacity="'+shine*light+'"/><stop offset=".55" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="'+shade*light+'"/></linearGradient>'],body=[];
 for(let i=0;i<strips;i++){const u=i/strips,v=(i+1)/strips,a=cx+cylinderCoordinate(u,radius,arc),b=cx+cylinderCoordinate(v,radius,arc),k=(b-a)*strips,id='s'+i;defs.push('<clipPath id="'+id+'"><rect x="'+a+'" y="'+(cy-sh/2)+'" width="'+(b-a+.15)+'" height="'+sh+'"/></clipPath>');body.push('<g clip-path="url(#'+id+')"><use href="#logo" transform="matrix('+k+' 0 0 '+sh+' '+(a-k*u)+' '+(cy-sh/2)+')"/></g>');}
 const handle=template==='mug'?'<path d="M'+(cx+r-8)+' '+(y+70)+' C'+(cx+r+125)+' '+(y+30)+' '+(cx+r+125)+' '+(y+h-40)+' '+(cx+r-8)+' '+(y+h-70)+'" fill="none" stroke="'+color+'" stroke-width="30"/>':'';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><defs>'+defs.join('')+'</defs><rect width="800" height="800" fill="'+background+'"/><ellipse cx="400" cy="'+(y+h+25)+'" rx="'+(r+35)+'" ry="24" opacity=".12"/>'+handle+'<rect x="'+(cx-r)+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="24" fill="'+color+'"/><ellipse cx="'+cx+'" cy="'+y+'" rx="'+r+'" ry="20" fill="'+color+'" stroke="#000000" stroke-opacity=".15"/>'+body.join('')+'<rect x="'+(cx-r)+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="24" fill="url(#shade)"/></svg>';
 if(Buffer.byteLength(svg)>3000000)throw RangeError('Surface output budget');
 return {version:'5.0.0',svg,width:800,height:800,source:structuredClone(doc),parameters:{template,material,color,background,arc,scale,light,strips},rendering:'cylindrical strip approximation with illustrative lighting'};
}
export function cylinderPNG(doc,options){return new Resvg(cylinderMockup(doc,options).svg).render().asPng();}
