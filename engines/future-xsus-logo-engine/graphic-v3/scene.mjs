// Data-only renderer shared by the service, editor and exporters.
const id=v=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_]{1,70}$/.test(v))throw TypeError('invalid_id');return v};
const num=(v,min=-1e6,max=1e6)=>{if(!Number.isFinite(v)||v<min||v>max)throw RangeError('invalid_number');return v};
const ink=v=>{if(typeof v!=='string'||!/^#[a-f0-9]{6}$/i.test(v))throw TypeError('invalid_color');return v};
const escape=s=>String(s).replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[v]));
const tag=(name,attrs,inside='')=>'<'+name+Object.entries(attrs).map(([k,v])=>' '+k+'="'+escape(v)+'"').join(' ')+'>'+inside+'</'+name+'>';
const arity={M:2,L:2,C:6,Q:4,A:7,Z:0};
export function pathData(commands,max=4096){
 if(!Array.isArray(commands)||commands.length<1||commands.length>max||commands[0][0]!=='M')throw RangeError('invalid_path');
 return commands.map(([op,...v])=>{
  if(!Object.hasOwn(arity,op)||v.length!==arity[op])throw TypeError('invalid_command');
  if(op==='A'&&(v[0]<0||v[1]<0||![0,1].includes(v[3])||![0,1].includes(v[4])))throw RangeError('invalid_arc');
  return op+v.map(x=>num(x)).join(' ');
 }).join(' ');
}
function paint(g,key){
 if(!['linear','radial'].includes(g.kind)||!Array.isArray(g.stops)||g.stops.length<2||g.stops.length>16)throw TypeError('invalid_gradient');
 let previous=-1;
 const stops=g.stops.map(s=>{const p=num(s.at,0,1);if(p<previous)throw RangeError('invalid_stops');previous=p;
  return tag('stop',{offset:p,'stop-color':ink(s.color),'stop-opacity':num(s.opacity??1,0,1)})}).join('');
 const a=num(g.angle??0,-3600,3600)*Math.PI/180,c=Math.cos(a)/2,s=Math.sin(a)/2;
 return g.kind==='linear'?tag('linearGradient',{id:key,x1:.5-c,y1:.5-s,x2:.5+c,y2:.5+s},stops):tag('radialGradient',{id:key,cx:num(g.cx,0,1),cy:num(g.cy,0,1),r:.65},stops);
}
export function renderGraphic(d,prefix='art'){
 id(prefix);
 if(d.graphic?.version!=='3.0.0'||d.version!=='1.0.0'||!Array.isArray(d.layers)||d.layers.length>256)throw TypeError('invalid_graphic');
 const w=num(d.width,1,8192),h=num(d.height,1,8192),ids=new Set(),defs=[],groups=new Map();
 let count=0;
 const shape=l=>{
  const name=id(l.id);if(ids.has(name))throw TypeError('duplicate_id');ids.add(name);
  const a={'data-layer-id':name,fill:ink(l.fill),opacity:num(l.opacity??1,0,1)};
  if(l.gradient){const key=prefix+'-'+name;defs.push(paint(l.gradient,key));a.fill='url(#'+key+')'}
  if(l.stroke){a.stroke=ink(l.stroke);a['stroke-width']=num(l.strokeWidth??1,0,1024);a['stroke-linejoin']='round'}
  if(l.hollow)a.fill='none';
  if(l.fillRule!==undefined){if(!['evenodd','nonzero'].includes(l.fillRule))throw TypeError('invalid_fill_rule');a['fill-rule']=l.fillRule}
  if(l.matrix){if(!Array.isArray(l.matrix)||l.matrix.length!==6)throw RangeError('invalid_matrix');a.transform='matrix('+l.matrix.map(x=>num(x)).join(' ')+')'}
  if(l.type==='path'){count+=l.commands.length;return tag('path',{...a,d:pathData(l.commands)})}
  if(l.type==='circle')return tag('circle',{...a,cx:num(l.cx),cy:num(l.cy),r:num(l.r,.001)});
  if(l.type==='polygon'){if(!Array.isArray(l.points)||l.points.length<3||l.points.length>4096)throw RangeError('invalid_polygon');count+=l.points.length;return tag('polygon',{...a,points:l.points.map(p=>[num(p.x??p[0]),num(p.y??p[1])].join(',')).join(' ')})}
  if(l.type!=='text'||typeof l.text!=='string'||l.text.length>160)throw TypeError('invalid_text');
  if(l.outline){count+=l.outline.length;return tag('g',{...a,'aria-label':l.text},tag('title',{},escape(l.text))+tag('path',{d:pathData(l.outline,8192)}))}
  const family=l.fontFamily??'sans-serif';if(!['serif','sans-serif','monospace'].includes(family))throw TypeError('invalid_font');
  return tag('text',{...a,x:num(l.x),y:num(l.y),'text-anchor':'middle','font-size':num(l.fontSize,0.1,1024),'font-family':family,'font-weight':num(l.fontWeight??400,100,900),'letter-spacing':num(l.tracking??0,-20,100)},escape(l.text));
 };
 const body=[];let active=null;
 for(const l of d.layers){
  const item=shape(l);if(count>32000)throw RangeError('document_budget');
  const group=l.group?id(l.group):null;
  if(group!==active){if(active)body.push('</g>');if(group){if(groups.has(group))throw TypeError('noncontiguous_group');groups.set(group,true);body.push('<g data-group="'+group+'">')}active=group}
  body.push(item);
 }if(active)body.push('</g>');
 return tag('svg',{xmlns:'http://www.w3.org/2000/svg',width:w,height:h,viewBox:'0 0 '+w+' '+h,role:'img'},(defs.length?tag('defs',{},defs.join('')):'')+body.join(''));
}
