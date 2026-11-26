import {renderVector} from './vector-canvas.mjs?v=creative2';
export function editProperties(document,id,patch,dom=globalThis.document){
 renderVector(document,dom);
 const next=structuredClone(document),layer=next.layers.find(l=>l.id===id);
 if(!layer||!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('invalid_edit');
 const allowed={circle:['fill','cx','cy','r'],polygon:['fill','points'],text:['fill','text','x','y','fontSize'],path:['fill','commands']}[layer.type];
 for(const key of Object.keys(patch)){if(!allowed.includes(key))throw Error('unsupported_property');layer[key]=structuredClone(patch[key])}
 renderVector(next,dom);return next;
}
export function transformLayer(document,id,{dx=0,dy=0,scale=1,rotation=0}={},dom=globalThis.document){
 renderVector(document,dom);
 if(![dx,dy,scale,rotation].every(Number.isFinite)||Math.abs(dx)>1e6||Math.abs(dy)>1e6||scale<=0||scale>100||Math.abs(rotation)>3600)throw Error('invalid_transform');
 const layer=document.layers.find(l=>l.id===id);if(!layer)throw Error('invalid_layer');
 const a=rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),ox=document.width/2,oy=document.height/2;
 const point=(x,y)=>({x:ox+scale*((x-ox)*c-(y-oy)*s)+dx,y:oy+scale*((x-ox)*s+(y-oy)*c)+dy});
 let patch;
 switch(layer.type){
 case 'circle':{const p=point(layer.cx,layer.cy);patch={cx:p.x,cy:p.y,r:layer.r*scale};break}
 case 'polygon':patch={points:layer.points.map(p=>point(p.x,p.y))};break;
 case 'text':{if(rotation!==0)throw Error('text_rotation_requires_outlines');const p=point(layer.x,layer.y);patch={x:p.x,y:p.y,fontSize:layer.fontSize*scale};break}
 case 'path':patch={commands:layer.commands.map(([op,...coords])=>{const result=[op];for(let i=0;i<coords.length;i+=2){const p=point(coords[i],coords[i+1]);result.push(p.x,p.y)}return result})};break;
 default:throw Error('unsupported_layer');
 }
 return editProperties(document,id,patch,dom);
}
