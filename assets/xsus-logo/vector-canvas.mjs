const NS='http://www.w3.org/2000/svg';
const number=v=>{if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e6)throw Error('invalid_coordinate');return v};
const positive=v=>{number(v);if(v<=0)throw Error('invalid_dimension');return v};
const color=v=>{if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))throw Error('invalid_color');return v};
export function renderVector(document,dom=globalThis.document){
 if(document?.version!=='1.0.0'||!Array.isArray(document.layers)||document.layers.length>256)throw Error('invalid_document');
 const {width,height}=document;
 if(![width,height].every(v=>Number.isInteger(v)&&v>=1&&v<=8192))throw Error('invalid_dimension');
 const node=(tag,attrs)=>{const el=dom.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));return el};
 const svg=node('svg',{xmlns:NS,viewBox:'0 0 '+width+' '+height,width,height,role:'img','aria-label':'Logo preview'});
 const ids=new Set();
 for(const layer of document.layers){
 if(typeof layer.id!=='string'||! /^[a-zA-Z0-9_-]{1,64}$/.test(layer.id)||ids.has(layer.id))throw Error('invalid_layer_id');
 ids.add(layer.id);const fill=color(layer.fill);let el;
 switch(layer.type){
 case 'circle':el=node('circle',{cx:number(layer.cx),cy:number(layer.cy),r:positive(layer.r),fill});break;
 case 'polygon':
 if(!Array.isArray(layer.points)||layer.points.length<3||layer.points.length>4096)throw Error('invalid_polygon');
 el=node('polygon',{points:layer.points.map(p=>number(p.x)+','+number(p.y)).join(' '),fill});break;
 case 'text':
 if(typeof layer.text!=='string'||layer.text.length>160||positive(layer.fontSize)>1024)throw Error('invalid_text');
 if(layer.fontFamily!==undefined&&!['serif','sans-serif','monospace'].includes(layer.fontFamily)||layer.fontWeight!==undefined&&![400,500,600,700].includes(layer.fontWeight))throw Error('invalid_text');
 el=node('text',{x:number(layer.x),y:number(layer.y),'font-size':layer.fontSize,'font-family':layer.fontFamily??'sans-serif',...(layer.fontWeight?{'font-weight':layer.fontWeight}:{}),'text-anchor':'middle',fill});el.textContent=layer.text;break;
 case 'path':{
 const lengths={M:3,L:3,Q:5,C:7,Z:1};
 if(!Array.isArray(layer.commands)||!layer.commands.length||layer.commands.length>512)throw Error('invalid_path');
 const d=layer.commands.map(c=>{if(!Array.isArray(c)||!Object.hasOwn(lengths,c[0])||c.length!==lengths[c[0]])throw Error('invalid_path');return [c[0],...c.slice(1).map(number)].join(' ')}).join(' ');
 el=node('path',{d,fill});break}
 default:throw Error('unsupported_layer');
 }
 el.setAttribute('data-layer-id',layer.id);svg.append(el);
 }
 return svg;
}
export function mountVector(container,document){const svg=renderVector(document,container.ownerDocument);container.replaceChildren(svg);return svg}
