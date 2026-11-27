// The input is already decoded RGBA. All following work uses bounded grids.
const N=32;
export const fingerprintVersion='xsus-visual-1';
const round=x=>Math.round(x*1000)/1000;
function components(mask,value){
 const seen=new Uint8Array(mask.length);let count=0,inner=0;
 for(let i=0;i<mask.length;i++){if(seen[i]||mask[i]!==value)continue;
  count++;let edge=false;const work=[i];seen[i]=1;
  while(work.length){const at=work.pop(),x=at%N,y=Math.floor(at/N);edge||=!x||!y||x===N-1||y===N-1;
   for(const j of [x?at-1:-1,x<N-1?at+1:-1,y?at-N:-1,y<N-1?at+N:-1]){
    if(j>=0&&!seen[j]&&mask[j]===value){seen[j]=1;work.push(j)}
   }
  }if(!edge)inner++;
 }return {count,inner};
}
const cos=Array.from({length:8},(_,k)=>Array.from({length:N},(_,i)=>Math.cos(Math.PI*k*(i+.5)/N)));
export function signature(bytes,w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w*h>16384||w<1||h<1||bytes.length!==w*h*4)throw RangeError('invalid_raster');
 const opacity=(x,y)=>bytes[(y*w+x)*4+3],px=[],palette=new Map();
 let x0=w,x1=-1,y0=h,y1=-1,sumX=0,sumY=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(opacity(x,y)<32)continue;const i=(y*w+x)*4;
  x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);sumX+=x+.5;sumY+=y+.5;px.push(i);
  const color=[bytes[i],bytes[i+1],bytes[i+2]].map(v=>Math.round(v/51)*51).map(v=>v.toString(16).padStart(2,'0')).join('');
  palette.set(color,(palette.get(color)??0)+1);
 }
 const span=Math.max(x1-x0+1,y1-y0+1,1),cx=(x0+x1+1)/2,cy=(y0+y1+1)/2;
 const mask=new Uint8Array(N*N),edge=new Uint8Array(N*N),gray=new Float32Array(N*N);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const sx=Math.floor(cx+(x+.5-N/2)*span/(N-2)),sy=Math.floor(cy+(y+.5-N/2)*span/(N-2)),j=y*N+x;
  gray[j]=255;if(sx<0||sy<0||sx>=w||sy>=h)continue;const i=(sy*w+sx)*4,a=bytes[i+3]/255;
  mask[j]=a>=.125?1:0;gray[j]=255*(1-a)+a*(.2126*bytes[i]+.7152*bytes[i+1]+.0722*bytes[i+2]);
 }
 for(let j=0;j<mask.length;j++)if(mask[j]&&(!mask[j-1]||!mask[j+1]||!mask[j-N]||!mask[j+N]))edge[j]=1;
 const coeff=[];for(let v=0;v<8;v++)for(let u=0;u<8;u++){let sum=0;for(let y=0;y<N;y++)for(let x=0;x<N;x++)sum+=gray[y*N+x]*cos[u][x]*cos[v][y];coeff.push(sum)}
 const median=coeff.slice(1).sort((a,b)=>a-b)[31];let dh='';
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){const j=(y*4+2)*N+Math.floor(x*3.5);dh+=Number(gray[j]>gray[j+3])}
 const bits=a=>Array.from(a).join('');
 return {version:fingerprintVersion,mask:bits(mask),edges:bits(edge),pHash:coeff.map(v=>Number(v>median)).join(''),dHash:dh,
 components:components(mask,1).count,holes:components(mask,0).inner,area:round(px.length/(w*h)),center:px.length?[round(sumX/px.length/w),round(sumY/px.length/h)]:[.5,.5],
 palette:[...palette].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([c])=>'#'+c),aspect:round((x1-x0+1)/Math.max(1,y1-y0+1))};
}
function iou(a,b){let hit=0,total=0;for(let i=0;i<a.length;i++){if(a[i]==='1'||b[i]==='1'){total++;if(a[i]===b[i])hit++}}return total?hit/total:1}
function rotate(bits,angle,mirror){
 if(!angle&&!mirror)return bits;const c=Math.cos(angle),s=Math.sin(angle),m=(N-1)/2;let out='';
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const u=(x-m)*(mirror?-1:1),v=y-m,xx=Math.round(u*c-v*s+m),yy=Math.round(u*s+v*c+m);
 out+=xx<0||xx>=N||yy<0||yy>=N?'0':bits[yy*N+xx]}return out;
}
const agreement=(a,b)=>Array.from(a).filter((c,i)=>c===b[i]).length/a.length;
export function compare(a,b){
 let silhouette=iou(a.mask,b.mask),boundary=iou(a.edges,b.edges);let orientation=0,mirrored=false;
 if(silhouette<.999){for(let i=0;i<24;i++)for(const m of [false,true]){
  const angle=i*Math.PI/12,v=iou(a.mask,rotate(b.mask,angle,m));if(v>silhouette){silhouette=v;boundary=iou(a.edges,rotate(b.edges,angle,m));orientation=i*15;mirrored=m}
 }}
 const topology=1/(1+Math.abs(a.holes-b.holes)+Math.abs(a.components-b.components)),ph=agreement(a.pHash,b.pHash),dh=agreement(a.dHash,b.dHash);
 const palette=a.palette.filter(c=>b.palette.includes(c)).length/Math.max(1,new Set([...a.palette,...b.palette]).size);
 const composition=Math.max(0,1-Math.hypot(a.center[0]-b.center[0],a.center[1]-b.center[1]));
 const structure=round(.78*silhouette+.09*boundary+.13*topology);
 return {structure,silhouette:round(silhouette),contours:round(boundary),topology:round(topology),perceptual:round((ph+dh)/2),palette:round(palette),composition:round(composition),orientation,mirrored,near:structure>=.93};
}
