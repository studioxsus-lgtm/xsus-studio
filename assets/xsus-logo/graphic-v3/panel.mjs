import {fontBytes,fontCatalog} from './font-assets.mjs';
import {styles,treatments} from './style.mjs';
import {layouts} from './composition.mjs';
import {gradient,finishes,palette,harmonies} from './color.mjs';
import {editNode,arcCubics,splitContour,joinContours,samplePath} from './curves.mjs';
import {typeset} from './typography.mjs';
const words={
 stretch:['Font width','Largeur de police','Gjerësia e fontit'],along:['Text on selected contour','Texte sur le contour','Tekst përgjatë konturit'],recover:['Restore source shapes','Restaurer les formes','Rikthe format burimore'],primitive:['Shape','Forme','Forma'],insert:['Insert shape','Insérer la forme','Shto formën'],split:['Split contour','Séparer le contour','Ndaj konturin'],join:['Join open contours','Joindre les contours','Bashko konturet'],strokeAlign:['Stroke position','Position du trait','Pozicioni i vijës'],guide:['Guides','Repères','Udhëzuesit'],cx:['Gradient center X','Centre X','Qendra X'],cy:['Gradient center Y','Centre Y','Qendra Y'],
 settings:['Design settings','Réglages graphiques','Cilësimet e dizajnit'],tools:['Vector tools','Outils vectoriels','Veglat vektoriale'],style:['Style','Style','Stili'],blend:['Second style','Second style','Stili i dytë'],layout:['Layout','Composition','Kompozimi'],font:['Typeface','Police','Fonti'],
 finish:['Finish','Dégradé','Gradienti'],slogan:['Slogan','Slogan','Slogani'],treatment:['Proportions','Proportions','Përmasat relative'],
 width:['Width','Largeur','Gjerësia'],height:['Height','Hauteur','Lartësia'],ink:['Accent','Accent','Ngjyra dytësore'],
 angle:['Angle','Angle','Këndi'],gradient:['Apply gradient','Appliquer le dégradé','Zbato gradientin'],geometry:['Geometry','Géométrie','Gjeometria'],
 operand:['Second layer','Deuxième calque','Shtresa e dytë'],apply:['Apply operation','Appliquer','Zbato veprimin'],node:['Nodes','Nœuds','Nyjet'],
 action:['Node action','Action sur le nœud','Veprimi mbi nyjën'],modify:['Edit node','Modifier le nœud','Ndrysho nyjën'],zoom:['Zoom','Zoom','Zmadhimi'],
 grid:['Grid','Grille','Rrjeta'],group:['Group selected pair','Grouper les deux calques','Grupo dy shtresat'],ungroup:['Ungroup','Dégrouper','Çgrupo'],
 align:['Center layer','Centrer le calque','Qendërzo shtresën'],board:['Resize artboard','Redimensionner','Ndrysho formatin'],tracking:['Letter spacing','Espacement','Hapësira e shkronjave'],
 curve:['Text curvature','Courbure du texte','Lakimi i tekstit'],type:['Apply type','Appliquer la police','Zbato tipografinë'],
 harmony:['Palette','Palette','Paleta'],hue:['Hue','Teinte','Toni'],paint:['Apply palette','Appliquer la palette','Zbato paletën'],
 stops:['Gradient stops','Arrêts du dégradé','Pikat e gradientit'],opacity:['Opacity','Opacité','Tejdukshmëria'],stroke:['Stroke width','Épaisseur du trait','Trashësia e vijës'],
 transform:['Transform','Transformer','Transformo'],rotation:['Rotation','Rotation','Rrotullimi'],scale:['Scale','Échelle','Shkalla'],outline:['Convert text to paths','Vectoriser le texte','Kthe tekstin në konture']};
const cache=new Map();
async function getFonts(meta){
 if(!cache.has(meta.id)){
  const {parse}=await import('./vector-tools.mjs');
  const list=(await fontBytes(meta)).map(bytes=>parse(bytes));if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(meta.id,list);
 }return cache.get(meta.id);
}
export function professionalPanel(root,get,workspace,run){
 const dom=root.ownerDocument,inputs={},labels={},canvas=get('canvas');
 const create=tag=>dom.createElement(tag),gen=create('fieldset'),edit=create('fieldset');
 gen.className=edit.className='graphic-options';
 const section=(key,fields,after)=>{const details=create('details'),summary=create('summary');labels[key]=summary;details.append(summary,fields);
  details.open=dom.defaultView.matchMedia('(min-width:701px)').matches;details.className='graphic-section';after.after(details);return details};
 const generateSection=section('settings',gen,get('prompt')),editSection=section('tools',edit,get('layers'));
 const control=(parent,key,values,init)=>{
  const wrap=create('label'),caption=create('span'),el=create(Array.isArray(values)?'select':'input');labels[key]=caption;
  if(Array.isArray(values))for(const v of values){const o=create('option');o.value=v;o.textContent=v||'—';el.append(o)}
  else el.type=values;
  if(init!==undefined)el.value=init;el.id='graphic-'+key;inputs[key]=el;wrap.append(caption,el);parent.append(wrap);return el;
 };
 const button=(key,fn)=>{const b=create('button');b.type='button';b.id='graphic-'+key;labels[key]=b;b.onclick=()=>run(fn);edit.append(b);return b};
 const value=k=>inputs[k].value,n=k=>Number(value(k));
 control(gen,'style',['',...Object.keys(styles)]);control(gen,'blend',['',...Object.keys(styles)]);control(gen,'treatment',treatments,'balanced');control(gen,'layout',['',...layouts]);
 const font=control(gen,'font',['']);let catalog=[];
 const load=async()=>{if(!catalog.length){catalog=await fontCatalog();
  for(const f of catalog){const o=create('option');o.value=f.id;o.textContent=f.family;font.append(o)}}};
 font.onfocus=()=>run(load);control(gen,'finish',finishes);control(gen,'slogan','text');inputs.slogan.maxLength=100;
 for(const k of ['width','height']){const el=control(gen,k,'number',512);el.min=32;el.max=4096}
 const state=()=>workspace().state().editor,selection=()=>state()?.selected;
 const apply=fn=>{const e=state();if(!e)throw Error('empty');const doc=e.document;doc.graphic??={version:'3.0.0',options:{}};fn(doc,doc.layers.find(l=>l.id===e.selected));workspace().edit('replaceDocument',doc,e.selected)};
 const selected=l=>{if(!l)throw Error('layer_not_found');return l};
 control(edit,'ink','color','#7953d6');control(edit,'angle','number',35);control(edit,'stops','text','');inputs.stops.placeholder='#142857, #ccaa66, #ffffff';
 control(edit,'opacity','number',1);control(edit,'stroke','number',0);
 control(edit,'strokeAlign',['center','inner','outer']);control(edit,'cx','number',.5);control(edit,'cy','number',.5);
 button('gradient',()=>apply((d,l)=>{selected(l);l.gradient=gradient(value('finish'),l.fill,value('ink'),n('angle'));if(l.gradient&&value('stops').trim()){
  const colors=value('stops').split(',').map(x=>x.trim());if(colors.length<2||colors.length>16)throw Error('invalid_stops');
  l.gradient.stops=colors.map((color,i)=>({at:i/(colors.length-1),color,opacity:1}));}if(l.gradient){l.gradient.cx=n('cx');l.gradient.cy=n('cy')}l.opacity=n('opacity');l.stroke=l.fill;l.strokeWidth=n('stroke');l.strokeAlignment=value('strokeAlign')}));
 control(edit,'harmony',Object.keys(harmonies));control(edit,'hue','number',210);button('paint',()=>apply(d=>{const colors=palette(n('hue'),value('harmony'));d.layers.forEach((l,i)=>{l.fill=colors[i%colors.length];delete l.gradient})}));
 control(edit,'tracking','number',.04);control(edit,'curve','number',0);control(edit,'stretch','number',1);control(edit,'along','checkbox');
 async function retype(l,text=l.text,size=l.fontSize){
  await load();const meta=catalog.find(f=>f.id===(value('font')||l.fontId||'dm-sans'));if(!meta)throw Error('invalid_font');
  const path=inputs.along.checked?state().document.layers.find(v=>v.id===value('operand')):null;if(inputs.along.checked&&!path?.commands)throw Error('path_required');
  return typeset({...l,text,fontSize:size,fontId:meta.id},await getFonts(meta),{tracking:n('tracking'),curve:n('curve'),stretch:n('stretch'),along:path?samplePath(path.commands)[0]:null,width:state().document.width*.90});
 }
 button('type',async()=>{const l=state()?.document.layers.find(x=>x.id===selection());if(l?.type!=='text')throw Error('invalid_text');const shaped=await retype(l);apply((d,current)=>Object.assign(selected(current),shaped))});
 button('outline',()=>apply((d,l)=>{if(!l?.outline)throw Error('outline_required');l.sourceText={...l};l.type='path';l.commands=l.outline;delete l.outline}));
 const operand=control(edit,'operand',['']);
 const pair=(d,l)=>{selected(l);const b=d.layers.find(x=>x.id===operand.value);if(!b||b.id===l.id)throw Error('second_layer_required');return b};
 control(edit,'geometry',['union','difference','intersection','exclusion','xor','divide','trim','merge','crop','compound','offset','inset','outline','simplify','deduplicate']);
 button('apply',async()=>{const {booleanPaths,flatten,layer}=await import('./vector-tools.mjs');
  const paths=l=>{if(l.matrix)throw Error('flatten_transform_first');if(l.type==='circle')return [Array.from({length:96},(_,i)=>[l.cx+l.r*Math.cos(i*Math.PI/48),l.cy+l.r*Math.sin(i*Math.PI/48)])];
   if(l.type==='polygon')return [l.points.map(p=>[p.x??p[0],p.y??p[1]])];let commands=l.commands??l.outline;if(!commands)throw Error('outline_required');
   let last;commands=commands.flatMap(c=>{const seg=c[0]==='A'?arcCubics(last,c.slice(1)):[c];if(c[0]!=='Z')last=c.slice(-2);return seg});return samplePath(commands)};
  apply((d,l)=>{selected(l);const op=value('geometry'),solo=['offset','inset','outline','simplify','deduplicate'].includes(op),b=solo?null:pair(d,l);
   const parts=booleanPaths(op,paths(l),b?paths(b):[],Math.max(.25,n('stroke')||2)).filter(s=>s.length);
   if(!parts.length)throw Error('empty_result');
   const sources=[l,...(b?[b]:[])].map(x=>{const copy={...x};delete copy.sources;return copy});
   const result=parts.map((p,i)=>({...layer(i?crypto.randomUUID():l.id,p,l.fill),sources}));d.layers=d.layers.flatMap(x=>x===l?result:x===b?[]:[x])});
 });
 button('recover',()=>apply((d,l)=>{selected(l);if(!l.sources?.length)throw Error('no_source_shapes');const occupied=new Set(d.layers.filter(x=>x!==l).map(x=>x.id));
  const restore=l.sources.map(x=>({...x,id:occupied.has(x.id)?crypto.randomUUID():x.id}));d.layers.splice(d.layers.indexOf(l),1,...restore)}));
 control(edit,'primitive',['rectangle','ellipse','open-curve']);
 button('insert',()=>apply(d=>{const x=d.width*.35,y=d.height*.35,w=d.width*.30,h=d.height*.30;
 const paths={rectangle:[['M',x,y],['L',x+w,y],['L',x+w,y+h],['L',x,y+h],['Z']],ellipse:[['M',x,y+h/2],['A',w/2,h/2,0,1,1,x+w,y+h/2],['A',w/2,h/2,0,1,1,x,y+h/2],['Z']],'open-curve':[['M',x,y],['C',x+w,y,x,y+h,x+w,y+h]]};
 const kind=value('primitive');d.layers.push({id:crypto.randomUUID(),type:'path',commands:paths[kind],fill:value('ink'),...(kind==='open-curve'?{stroke:value('ink'),strokeWidth:3,hollow:true}:{})})}));
 button('split',()=>apply((d,l)=>{selected(l);const [a,b]=splitContour(l.commands,index);d.layers.splice(d.layers.indexOf(l),1,{...l,commands:a,sources:[{...l,sources:undefined}]},{...l,id:crypto.randomUUID(),commands:b})}));
 button('join',()=>apply((d,l)=>{const b=pair(d,l);const commands=joinContours(l.commands,b.commands);l.sources=[{...l,sources:undefined},{...b,sources:undefined}];l.commands=commands;d.layers=d.layers.filter(x=>x!==b)}));
 button('group',()=>apply((d,l)=>{const b=pair(d,l),gid='g-'+crypto.randomUUID();d.layers=d.layers.filter(x=>x!==b);d.layers.splice(d.layers.indexOf(l)+1,0,b);l.group=b.group=gid}));
 button('ungroup',()=>apply((d,l)=>{if(selected(l).group)for(const item of d.layers.filter(x=>x.group===l.group))delete item.group}));
 control(edit,'rotation','number',0);control(edit,'scale','number',1);button('transform',()=>apply((d,l)=>{selected(l);const a=n('rotation')*Math.PI/180,s=n('scale'),c=Math.cos(a)*s,b=Math.sin(a)*s;if(!(s>0&&s<=10))throw Error('invalid_scale');l.matrix=[c,b,-b,c,d.width/2*(1-c)+b*d.height/2,d.height/2*(1-c)-b*d.width/2]}));
 button('align',()=>apply((d,l)=>{selected(l);const el=canvas.querySelector('[data-layer-id="'+l.id+'"]'),b=el.getBBox();l.matrix=[1,0,0,1,d.width/2-b.x-b.width/2,d.height/2-b.y-b.height/2]}));
 button('board',()=>apply(d=>{const w=n('width'),h=n('height');if(![w,h].every(x=>Number.isInteger(x)&&x>=32&&x<=4096))throw Error('invalid_dimension');d.width=w;d.height=h}));
 let index=1;const nodes=control(edit,'node','checkbox');const action=control(edit,'action',['split','remove','smooth','curve','line']);
 button('modify',()=>apply((d,l)=>{selected(l);l.commands=editNode(l.commands,index,action.value)}));
 const zoom=control(edit,'zoom','range',100);zoom.min=50;zoom.max=300;
 const guides=control(edit,'guide',['off','thirds','golden']);guides.onchange=()=>workspace().edit('select',selection());
 const grid=control(edit,'grid','checkbox');grid.onchange=()=>canvas.classList.toggle('graphic-grid',grid.checked);
 function overlay(){const svg=canvas.querySelector('svg');if(!svg)return;svg.style.width=zoom.value+'%';svg.style.maxWidth='none';svg.style.flexShrink='0';
  const l=state()?.document.layers.find(l=>l.id===selection());
  if(guides.value!=='off'){const d=state().document;for(const r of guides.value==='thirds'?[1/3,2/3]:[.382,.618]){for(const vertical of [true,false]){
   const path=dom.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',vertical?'M'+(r*d.width)+' 0v'+d.height:'M0 '+(r*d.height)+'h'+d.width);
   path.setAttribute('stroke','#7e65c2');path.setAttribute('stroke-dasharray','6 6');path.style.pointerEvents='none';svg.append(path)}}}
  if(!nodes.checked||!l?.commands)return;
  const ns='http://www.w3.org/2000/svg',g=dom.createElementNS(ns,'g');if(l.matrix)g.setAttribute('transform','matrix('+l.matrix.join(' ')+')');svg.append(g);
  const radius=Math.max(3,svg.viewBox.baseVal.width*.008);l.commands.forEach((cmd,i)=>{if(cmd[0]==='Z')return;
   const coords=cmd[0]==='A'?[cmd.slice(-2)]:Array.from({length:(cmd.length-1)/2},(_,j)=>cmd.slice(1+j*2,3+j*2));
   for(const [j,[x,y]] of coords.entries()){const dot=dom.createElementNS(ns,'circle');dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('r',radius);dot.setAttribute('fill',i===index?'#ff9b27':j===coords.length-1?'#22b8cf':'#af6be7');dot.style.touchAction='none';g.append(dot);
    dot.onpointerdown=ev=>{ev.stopPropagation();ev.preventDefault();index=i;dot.setPointerCapture(ev.pointerId);let moved=false;
     const point=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(g.getScreenCTM().inverse());
     dot.onpointermove=e=>{moved=true;const p=point(e);dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y)};
     dot.onpointerup=e=>{dot.onpointermove=null;dot.onpointerup=null;if(!moved)return;const p=point(e);run(()=>apply((d,s)=>{s.commands=editNode(s.commands,i,j===coords.length-1?'move':'handle',[p.x,p.y,j])}))};
    };
   }
  });
 }
 nodes.onchange=()=>{workspace().edit('select',selection())};zoom.oninput=()=>{const svg=canvas.querySelector('svg');if(svg)svg.style.width=zoom.value+'%'};
 return {options(){const picked=[value('style'),value('blend')].filter(Boolean);return {...(picked.length?{styles:picked}:{}),treatment:value('treatment'),...(value('layout')?{layout:value('layout')}:{ }),
  ...(font.value?{font:font.value}:{}),width:n('width'),height:n('height'),slogan:value('slogan'),finish:value('finish'),angle:n('angle')}},
 render(s,lang){for(const [k,el] of Object.entries(labels))el.textContent=words[k][{en:0,fr:1,sq:2}[lang]??0];
 gen.hidden=get('mode').value!=='professional';edit.hidden=!s.editor||(!s.editor.document.graphic&&gen.hidden);generateSection.hidden=gen.hidden;editSection.hidden=edit.hidden;gen.disabled=edit.disabled=s.busy;
 const old=operand.value;operand.replaceChildren();for(const l of s.editor?.document.layers??[]){if(l.id===s.editor.selected)continue;const o=create('option');o.value=l.id;o.textContent=l.id;operand.append(o)}if([...operand.options].some(o=>o.value===old))operand.value=old;overlay()},
 retype};
}
