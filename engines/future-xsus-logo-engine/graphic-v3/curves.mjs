const lerp=(a,b,t)=>a.map((v,k)=>v+(b[k]-v)*t);
export function splitBezier(controls,t=.5){
 if(!Array.isArray(controls)||controls.length<2||controls.length>4||controls.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)))||!(t>0&&t<1))throw RangeError('invalid_curve');
 let row=controls;const left=[row[0]],right=[row.at(-1)];
 while(row.length>1){row=row.slice(1).map((p,i)=>lerp(row[i],p,t));left.push(row[0]);right.unshift(row.at(-1))}
 return [left,right];
}
export function arcCubics(start,[rx,ry,degrees,large,sweep,x,y]){
 if(![...start,rx,ry,degrees,x,y].every(Number.isFinite)||![0,1].includes(large)||![0,1].includes(sweep)||rx<0||ry<0)throw RangeError('invalid_arc');
 if(x===start[0]&&y===start[1])return [];
 if(!rx||!ry)return [['L',x,y]];
 const phi=degrees*Math.PI/180,c=Math.cos(phi),s=Math.sin(phi),dx=(start[0]-x)/2,dy=(start[1]-y)/2;
 const u=c*dx+s*dy,v=-s*dx+c*dy,f=Math.max(1,Math.hypot(u/rx,v/ry));rx*=f;ry*=f;
 const d=(u/rx)**2+(v/ry)**2,k=(large===sweep?-1:1)*Math.sqrt(Math.max(0,(1-d)/d));
 const ox=k*rx*v/ry,oy=-k*ry*u/rx;
 const cx=c*ox-s*oy+(start[0]+x)/2,cy=s*ox+c*oy+(start[1]+y)/2;
 const a=Math.atan2((v-oy)/ry,(u-ox)/rx),b=Math.atan2((-v-oy)/ry,(-u-ox)/rx);
 let span=b-a;if(sweep&&span<0)span+=2*Math.PI;if(!sweep&&span>0)span-=2*Math.PI;
 const steps=Math.max(1,Math.ceil(Math.abs(span)/(Math.PI/2))),out=[];
 const point=(i,j)=>[cx+rx*i*c-ry*j*s,cy+rx*i*s+ry*j*c];
 for(let i=0;i<steps;i++){const p=a+span*i/steps,q=a+span*(i+1)/steps,h=4/3*Math.tan((q-p)/4);
  out.push(['C',...point(Math.cos(p)-h*Math.sin(p),Math.sin(p)+h*Math.cos(p)),...point(Math.cos(q)+h*Math.sin(q),Math.sin(q)-h*Math.cos(q)),...point(Math.cos(q),Math.sin(q))]);}
 out.at(-1).splice(-2,2,x,y);return out;
}
export function editNode(commands,index,op,coordinates){
 const next=structuredClone(commands),cmd=next[index];if(!cmd||cmd[0]==='Z')throw RangeError('invalid_node');
 const [code,...args]=cmd,prev=next[index-1]?.slice(-2);
 if(op==='move'||op==='handle'){
  const [x,y,handle=0]=coordinates;
  const at=op==='move'?cmd.length-2:1+2*handle;
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isInteger(at)||at<1||at+1>=cmd.length||op==='handle'&&(!['C','Q'].includes(code)||at>=cmd.length-2))throw RangeError('invalid_handle');
  cmd.splice(at,2,x,y);return next;
 }
 if(code==='M'||!prev||prev.length<2)throw RangeError('invalid_segment');
 const end=args.slice(-2);
 if(op==='remove')next.splice(index,1);
 else if(op==='line')next[index]=['L',...end];
 else if(op==='curve')next[index]=['C',...lerp(prev,end,1/3),...lerp(prev,end,2/3),...end];
 else if(op==='smooth'){
  const after=next[index+1];
  if(!after||!['L','C','Q'].includes(after[0]))throw RangeError('adjacent_segment_required');
  const to=after.slice(-2),v=to.map((p,k)=>(p-prev[k])/6);
  next[index]=['C',...lerp(prev,end,1/3),...end.map((p,k)=>p-v[k]),...end];
  next[index+1]=['C',...end.map((p,k)=>p+v[k]),...lerp(end,to,2/3),...to];
 }else if(op==='split'){
  if(code==='A'){next.splice(index,1,...arcCubics(prev,args));return next}
  const control=[prev,...Array.from({length:args.length/2},(_,i)=>args.slice(i*2,i*2+2))];
  next.splice(index,1,...splitBezier(control).map(segment=>[code,...segment.slice(1).flat()]));
 }else throw RangeError('invalid_node_operation');
 return next;
}
export function splitContour(commands,index){
 if(!Number.isInteger(index)||index<1||index>=commands.length-1||['M','Z'].includes(commands[index][0]))throw RangeError('invalid_split');
 const left=commands.slice(0,index+1),right=commands.slice(index+1);
 if(right.some(c=>c[0]==='M')||left.slice(1).some(c=>c[0]==='M'))throw RangeError('single_contour_required');
 if(right.at(-1)?.[0]==='Z'){right.pop();right.push(['L',...commands[0].slice(-2)])}
 return [left,[['M',...commands[index].slice(-2)],...right]];
}
export function joinContours(a,b){
 if(![a,b].every(p=>p[0]?.[0]==='M'&&p.slice(1).every(c=>!['M','Z'].includes(c[0]))))throw RangeError('open_contours_required');
 const end=a.at(-1).slice(-2),start=b[0].slice(-2);
 return [...a,...(end.every((x,i)=>x===start[i])?[]:[['L',...start]]),...b.slice(1)];
}
// Adaptive polygonal approximation for interactive Boolean operations.
// Recursion is bounded independently of the path's coordinates.
export function samplePath(commands,tolerance=.2){
 if(!Number.isFinite(tolerance)||tolerance<.01||tolerance>4||!Array.isArray(commands)||commands.length>4096)throw RangeError('curve_budget');
 const contours=[];let points=[],last,start,count=0;
 const emit=p=>{if(++count>4096)throw RangeError('curve_budget');points.push(p);last=p};
 const length=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
 const sample=(ps,depth)=>{
  const a=ps[0],b=ps.at(-1),chord=length(a,b);
  const e=Math.max(...ps.slice(1,-1).map(p=>chord?Math.abs((b[0]-a[0])*(a[1]-p[1])-(a[0]-p[0])*(b[1]-a[1]))/chord:length(a,p)));
  const excess=ps.slice(1).reduce((n,p,i)=>n+length(ps[i],p),0)-chord;
  if(e<=tolerance&&excess<=2*tolerance){emit(b);return}
  if(depth>=12)throw RangeError('curve_tolerance');for(const half of splitBezier(ps))sample(half,depth+1);
 };
 function segment(cmd){const [op,...v]=cmd;if(v.some(n=>!Number.isFinite(n)))throw RangeError('invalid_coordinate');
  if(op==='M'){if(points.length)contours.push(points);points=[];emit(v);start=v}
  else if(!last)throw RangeError('invalid_path');
  else if(op==='Z'){if(points.length)contours.push(points);points=[];last=start}
  else if(op==='L')emit(v);
  else if(op==='C'||op==='Q')sample([last,...Array.from({length:v.length/2},(_,i)=>v.slice(i*2,i*2+2))],0);
  else if(op==='A')for(const c of arcCubics(last,v))segment(c);else throw RangeError('invalid_command');
 }
 commands.forEach(segment);if(points.length)contours.push(points);return contours;
}
export function baseline(points){
 if(!Array.isArray(points)||points.length<2||points.length>4096)throw RangeError('invalid_baseline');
 const parts=[];let total=0;
 for(let i=1;i<points.length;i++){const [x,y]=points[i-1],dx=points[i][0]-x,dy=points[i][1]-y,len=Math.hypot(dx,dy);
  if(len>0){parts.push({x,y,dx,dy,len,start:total});total+=len}}
 if(!total)throw RangeError('invalid_baseline');
 return {length:total,at(distance){const d=Math.min(total,Math.max(0,distance));const s=parts.find(v=>v.start+v.len>=d)??parts.at(-1);
  const t=(d-s.start)/s.len;return [s.x+t*s.dx,s.y+t*s.dy,Math.atan2(s.dy,s.dx)]}};
}
