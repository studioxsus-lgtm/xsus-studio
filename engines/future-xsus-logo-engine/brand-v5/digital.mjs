import {renderEditor} from '../editor.mjs';
const layouts={website:[1200,800,100,100,1000,600],tablet:[1000,800,180,90,640,620],watch:[800,800,270,270,260,260],laptop:[1200,800,180,90,840,480],appIcon:[800,800,200,200,400,400],socialAvatar:[800,800,180,180,440,440],emailHeader:[1200,600,100,180,1000,240],digitalPoster:[800,1200,100,100,600,1000]};
export const digitalTemplates=Object.freeze(Object.keys(layouts));
export function digitalMockup(doc,{template='website',color='#ffffff',background='#dce2e8',scale=.65}={}){
 renderEditor(doc);if(!Object.hasOwn(layouts,template)||[color,background].some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))||!Number.isFinite(scale)||scale<.1||scale>1)throw TypeError('Invalid digital parameters');
 const [width,height,x,y,w,h]=layouts[template],s=Math.min(w/doc.width,h/doc.height)*scale;
 const rect=(x,y,w,h,fill,rx=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'"/>';
 let frame='';
 if(template==='website')frame=rect(x-12,y-42,w+24,h+54,'#243142',12)+[0,1,2].map(i=>'<circle cx="'+(x+12+i*20)+'" cy="'+(y-20)+'" r="5" fill="#ffffff"/>').join('');
 if(template==='tablet')frame=rect(x-20,y-20,w+40,h+40,'#243142',28);
 if(template==='watch')frame=rect(x+65,30,130,740,'#485565',28)+rect(x-18,y-18,w+36,h+36,'#243142',50);
 if(template==='laptop')frame=rect(x-18,y-18,w+36,h+36,'#243142',16)+rect(x-100,y+h+18,w+200,40,'#84909e',12);
 const shape=template==='socialAvatar'?'<circle cx="'+(x+w/2)+'" cy="'+(y+h/2)+'" r="'+w/2+'" fill="'+color+'"/>':rect(x,y,w,h,color,template==='appIcon'?90:template==='watch'?35:4);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'">'+rect(0,0,width,height,background)+frame+shape+'<g transform="translate('+(x+(w-doc.width*s)/2)+' '+(y+(h-doc.height*s)/2)+') scale('+s+')">'+renderEditor(doc)+'</g></svg>';
 if(Buffer.byteLength(svg)>2000000)throw RangeError('Digital budget');return {version:'5.0.0',svg,width,height,source:structuredClone(doc),parameters:{template,color,background,scale},rendering:'digital device and media illustration'};
}
