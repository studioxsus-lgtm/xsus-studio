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
