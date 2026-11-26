const clamp=x=>Math.min(1,Math.max(0,x));
const hex=rgb=>'#'+rgb.map(x=>Math.round(clamp(x)*255).toString(16).padStart(2,'0')).join('');
const triple=(v,n)=>{if(!Array.isArray(v)||v.length!==n||!v.every(Number.isFinite))throw TypeError('invalid_color');return v};
export function convert(space,values){
 if(space==='hex'){if(!/^#[0-9a-f]{6}$/i.test(values))throw TypeError('invalid_color');return values.toLowerCase()}
 if(space==='rgb')return hex(triple(values,3).map(v=>v/255));
 if(space==='cmyk'){const [c,m,y,k]=triple(values,4);return hex([c,m,y].map(v=>(1-v)*(1-k)))}
 if(!['hsl','hsv'].includes(space))throw TypeError('invalid_space');
 const [deg,s,v]=triple(values,3),h=((deg%360)+360)%360/60,c=space==='hsl'?(1-Math.abs(2*v-1))*s:v*s;
 const x=c*(1-Math.abs(h%2-1)),m=space==='hsl'?v-c/2:v-c;
 return hex([[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h)].map(a=>a+m));
}
export function analysis(color){
 convert('hex',color);
 const rgb=color.slice(1).match(/../g).map(x=>parseInt(x,16)/255),[r,g,b]=rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const [l,m,s]=[.41222147*r+.53633254*g+.05144599*b,.21190350*r+.68069955*g+.10739696*b,.08830246*r+.28171884*g+.62997870*b].map(Math.cbrt);
 return {luminance:.2126*r+.7152*g+.0722*b,oklab:[.21045426*l+.79361779*m-.00407205*s,1.9779985*l-2.4285922*m+.4505937*s,.025904*l+.7827718*m-.8086758*s]};
}
export const harmonies={complementary:[0,180],analogous:[-30,0,30],triadic:[0,120,240],tetradic:[0,90,180,270],monochrome:[0,0,0],neutral:[0,0,0]};
export function palette(hue,kind){
 if(!Object.hasOwn(harmonies,kind))throw TypeError('invalid_harmony');
 return harmonies[kind].map((offset,i)=>convert('hsl',[hue+offset,kind==='neutral'?.06:.68,['monochrome','neutral'].includes(kind)?.23+i*.23:.43]));
}
export const finishes=['solid','linear','radial','transparent','metallic','neon','pastel','monochrome','contrast'];
export function gradient(finish,a,b,angle=35){
 if(!finishes.includes(finish)||!Number.isFinite(angle))throw RangeError('invalid_gradient');
 convert('hex',a);convert('hex',b);
 if(finish==='solid')return null;
 const swatches={metallic:[a,'#fbebbf',b,'#ffffff',a],neon:[a,'#ffffff',b],pastel:[a,'#fff3fa',b],monochrome:[a,'#818181','#ededed'],contrast:['#101018',a,'#ffffff']};
 const colors=swatches[finish]??[a,b];
 return {kind:finish==='radial'?'radial':'linear',angle,cx:.5,cy:.5,stops:colors.map((color,i)=>({color,at:i/(colors.length-1),opacity:finish==='transparent'?1-i/(colors.length-1):1}))};
}
