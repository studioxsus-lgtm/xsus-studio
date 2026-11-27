import {mockupScene} from './mockup.mjs';
import {Resvg} from '@resvg/resvg-js';
// Inverse projective mapping of a rendered surface, with bounded output.
export function homography(quad){
 if(!Array.isArray(quad)||quad.length!==4||quad.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>8192)))throw TypeError('Invalid quadrilateral');
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
 const turns=quad.map((p,i)=>cross(p,quad[(i+1)%4],quad[(i+2)%4]));
 if(!turns.every(x=>x>1e-6)&&!turns.every(x=>x< -1e-6))throw RangeError('Nonconvex quadrilateral');
 const uv=[[0,0],[1,0],[1,1],[0,1]],m=[];
 for(let i=0;i<4;i++){const [u,v]=uv[i],[x,y]=quad[i];m.push([u,v,1,0,0,0,-u*x,-v*x,x],[0,0,0,u,v,1,-u*y,-v*y,y]);}
 for(let i=0;i<8;i++){let p=i;for(let j=i+1;j<8;j++)if(Math.abs(m[j][i])>Math.abs(m[p][i]))p=j;[m[i],m[p]]=[m[p],m[i]];const d=m[i][i];if(Math.abs(d)<1e-10)throw RangeError('Singular projection');m[i]=m[i].map(v=>v/d);for(let j=0;j<8;j++)if(j!==i){const f=m[j][i];m[j]=m[j].map((v,k)=>v-f*m[i][k]);}}
 return [...m.map(r=>r[8]),1];
}
export function projectPoint(h,u,v){const d=h[6]*u+h[7]*v+h[8];if(Math.abs(d)<1e-10)throw RangeError('Projection at infinity');return [(h[0]*u+h[1]*v+h[2])/d,(h[3]*u+h[4]*v+h[5])/d];}
export function projectedMockup(doc,{quad,width=1000,height=800,grid=20,...options}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||height<64||width*height>4000000||width>4096||height>4096||!Number.isInteger(grid)||grid<4||grid>40)throw RangeError('Projection budget');
 const h=homography(quad);if(quad.some(([x,y])=>x<0||y<0||x>width||y>height))throw RangeError('Projection outside canvas');
 const scene=mockupScene(doc,options),png=new Resvg(scene.svg).render().asPng(),uri='data:image/png;base64,'+Buffer.from(png).toString('base64');
 const defs=['<image id="source" width="1" height="1" preserveAspectRatio="none" href="'+uri+'"/>'],body=[];
 const tri=(a,b,c)=>{const [p,q,r]=[a,b,c].map(([u,v])=>projectPoint(h,u,v));const du=b[0]-a[0],dv=b[1]-a[1],eu=c[0]-a[0],ev=c[1]-a[1],det=du*ev-dv*eu;
 const A=((q[0]-p[0])*ev-(r[0]-p[0])*dv)/det,B=((q[1]-p[1])*ev-(r[1]-p[1])*dv)/det,C=((r[0]-p[0])*du-(q[0]-p[0])*eu)/det,D=((r[1]-p[1])*du-(q[1]-p[1])*eu)/det,E=p[0]-A*a[0]-C*a[1],F=p[1]-B*a[0]-D*a[1],id='tile'+body.length;
 defs.push('<clipPath id="'+id+'"><polygon points="'+[p,q,r].map(x=>x.join(',')).join(' ')+'"/></clipPath>');body.push('<g clip-path="url(#'+id+')"><use href="#source" transform="matrix('+[A,B,C,D,E,F].join(' ')+')"/></g>');};
 for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){const a=[x/grid,y/grid],b=[(x+1)/grid,y/grid],c=[(x+1)/grid,(y+1)/grid],d=[x/grid,(y+1)/grid];tri(a,b,c);tri(a,c,d);}
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'"><defs>'+defs.join('')+'</defs>'+body.join('')+'</svg>';
 if(Buffer.byteLength(svg)>8000000)throw RangeError('Projection output budget');
 return {svg,width,height,quad:structuredClone(quad),grid,source:scene.source,parameters:scene.parameters,template:scene.template,rendering:'piecewise affine approximation of projective mapping of complete mockup'};
}
export function projectedPNG(doc,options){return new Resvg(projectedMockup(doc,options).svg).render().asPng();}
