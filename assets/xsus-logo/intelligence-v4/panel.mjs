import {renderVector} from '../vector-canvas.mjs?v=graphic3';
import {signature,compare} from './signature.mjs';
const words={
 en:['Design assistant','Instruction','Preview','Improve design','Apply','Reject','Before','After','Analyze variants','Size proof','Undo edit','Redo edit','Lock','Unlock','Layer','Color','Typography','History','Restore','Prefer variant','Reject variant','Compare reference (PNG)','Variant','Score','Similar pair','Secondary layer','Surface','Select a saved project','Save current changes','No measured improvement','Scale','Ink coverage','Issues'],
 sq:['Asistenti i dizajnit','Udhëzimi','Parapamje','Përmirëso dizajnin','Prano','Refuzo','Para','Pas','Analizo variantet','Verifiko përmasat','Zhbëj ndryshimin','Ribëj ndryshimin','Kyç','Shkyç','Shtresa','Ngjyra','Tipografia','Historiku','Rikthe','Pëlqe variantin','Refuzo variantin','Krahaso referencën (PNG)','Varianti','Pikë','Çift i ngjashëm','Shtresa e dytë','Sfondi','Zgjidh një projekt të ruajtur','Ruaj ndryshimet aktuale','Pa përmirësim të matur','Përmasa','Mbulimi','Probleme'],
 fr:['Assistant de conception','Instruction','Aperçu','Améliorer le design','Appliquer','Rejeter','Avant','Après','Analyser les variantes','Vérifier les tailles','Annuler la modification','Rétablir la modification','Verrouiller','Déverrouiller','Calque','Couleur','Typographie','Historique','Restaurer','Préférer la variante','Rejeter la variante','Comparer une référence (PNG)','Variante','Score','Paire similaire','Deuxième calque','Fond','Sélectionnez un projet enregistré','Enregistrez les modifications','Aucune amélioration mesurée','Taille','Couverture','Problèmes']};
const extras={en:['Keep alternative','Save analysis','Clear edit history','Delete saved undo history for this project?','Preview surface','Choose a layer to clarify the instruction.','This layer or property is locked.'],sq:['Ruaj alternativën','Ruaj analizën','Pastro historikun','Ta fshij historikun e ndryshimeve të këtij projekti?','Sipërfaqja','Zgjidh shtresën që dëshiron të ndryshosh.','Kjo shtresë ose veti është e kyçur.'],fr:['Conserver une alternative','Enregistrer l’analyse','Effacer l’historique','Effacer les modifications enregistrées de ce projet ?','Support','Sélectionnez le calque à modifier.','Ce calque ou cette propriété est verrouillé.']};
for(const lang of Object.keys(words))words[lang].push(...extras[lang]);
export function intelligencePanel(root,getWorkspace,run){
 const dom=root.ownerDocument,el=n=>dom.createElement(n),panel=el('details'),summary=el('summary'),body=el('div');
 panel.className='graphic-section intelligent-panel';panel.append(summary,body);root.append(panel);
 let lang='en',pending,key='',analysis,report=null;
 const labels=[],t=i=>(words[lang]??words.en)[i];
 const field=(i,tag)=>{const l=el('label'),s=el('span'),input=el(tag);labels.push([s,i]);l.append(s,input);body.append(l);return input};
 const instruction=field(1,'textarea');instruction.maxLength=800;
 const secondary=field(25,'select'),surface=field(26,'input');surface.type='color';surface.value='#ffffff';
 const kind=field(14,'select');for(const [i,v] of [[14,'layer'],[15,'color'],[16,'type']]){const o=el('option');labels.push([o,i]);o.value=v;kind.append(o)}
 const buttons=el('div');buttons.className='edit-actions';body.append(buttons);
 const output=el('div'),comparison=el('div'),note=el('p');note.setAttribute('role','status');comparison.className='edit-comparison';
 const context=()=>{const s=getWorkspace().state();return {language:lang,requestId:crypto.randomUUID(),selected:s.editor?.selected??null,secondary:secondary.value||null,surface:surface.value}};
 const request=async(action,extra={})=>{try{return await getWorkspace().operation({...context(),action,...extra})}catch(error){
  const i=({ambiguous_target:38,locked_color:39,locked_layer:39,locked_type:39,no_verified_improvement:29})[error.message];
  note.textContent=i?t(i):error.message;throw error;
 }};
 const cancel=()=>{pending=null;comparison.replaceChildren();apply.disabled=true;reject.disabled=true};
 const btn=(i,fn)=>{const b=el('button');b.type='button';labels.push([b,i]);b.addEventListener('click',()=>run(fn));buttons.append(b);return b};
 function picture(i,d){const f=el('figure'),caption=el('figcaption'),v=renderVector(d,dom);caption.textContent=t(i);v.style.background=surface.value;f.append(caption,v);return f}
 async function preview(improve){cancel();const p={...context(),instruction:instruction.value,improve};
  const result=await request('preview',p);pending={...p,approval:result.approval,revision:result.revision};
  comparison.replaceChildren(picture(6,result.before),picture(7,result.after));apply.disabled=reject.disabled=false;
 }
 btn(2,()=>preview(false));btn(3,()=>preview(true));
 const apply=btn(4,async()=>{if(!pending)return;const current=pending;await request('apply',current);cancel()});
 const reject=btn(5,cancel);
 const line=value=>{const p=el('p');p.textContent=value;output.append(p)};
 async function analyze(){report=await request('analyze');output.replaceChildren();
  for(const v of report.ranking){line(t(22)+' '+(v.index+1)+' · '+t(23)+' '+v.score+'/100');if(v.issues.length)line(t(32)+' · '+v.issues.map(i=>i.code).join(', '));
   const explanation=v.explanation;line([explanation.layout,...explanation.subjects,...explanation.fonts,...explanation.inks].filter(Boolean).join(' · '));
   const details=el('details'),s=el('summary');s.textContent=t(23);details.append(s);
   for(const d of v.dimensions){const p=el('p');p.textContent=d.key+' · '+(d.score??'—')+' / 100 · '+d.kind+' · ×'+d.weight+' · '+JSON.stringify(d.evidence);details.append(p)}output.append(details);
  }for(const pair of report.pairs.filter(p=>p.near))line(t(24)+' '+(pair.first+1)+' / '+(pair.second+1)+' · '+Math.round(pair.structure*100)+'%');
 }
 analysis=btn(8,analyze);btn(9,async()=>{const r=await request('scales');output.replaceChildren();for(const s of r.scales){line(t(30)+' '+s.size+' × '+s.size+' · '+t(31)+' '+(100*s.coverage).toFixed(1)+'%');if(s.size<=256){const v=renderVector(getWorkspace().state().editor.document,dom);v.style.width=s.size+'px';v.style.height=s.size+'px';v.style.background=surface.value;output.append(v)}}});
 for(const [i,action] of [[10,'undo'],[11,'redo'],[12,'lock'],[13,'unlock'],[19,'prefer'],[20,'rejectVariant']])btn(i,()=>request(action,action==='lock'||action==='unlock'?{kind:kind.value}:{}));
 const history=field(17,'select');btn(18,()=>request('restore',{position:Number(history.value)}));
 btn(33,()=>request('archive'));btn(34,()=>request('report'));btn(35,()=>dom.defaultView.confirm(t(36))&&request('clearHistory',{confirm:true}));
 const media=field(37,'select');
 const mediaLabels={en:['White','Black','Transparent','Custom','Website','App icon','Document','Print preview','Social post'],fr:['Blanc','Noir','Transparent','Personnalisé','Site web','Icône','Document','Aperçu imprimé','Publication'],sq:['Bardhë','Zi','Transparent','E zgjedhur','Website','Ikonë aplikacioni','Dokument','Pamje për shtyp','Rrjete sociale']};
 const surfaces=[['#ffffff',220],['#000000',220],['transparent',220],['custom',220],['#eff4fa',120],['#222530',48],['#ffffff',90],['#f6f2eb',160],['#273147',256]];
 const previews=el('div');body.append(previews);
 function showSurface(){previews.replaceChildren();const d=getWorkspace()?.state().editor?.document;if(!d)return;
  const [background,size]=surfaces[Number(media.value)||0],v=renderVector(d,dom);v.style.width=size+'px';v.style.height=size+'px';
  previews.style.background=background==='transparent'?'repeating-conic-gradient(#bbb 0 25%,white 0 50%) 0/12px 12px':background==='custom'?surface.value:background;previews.append(v)}
 media.addEventListener('change',showSurface);surface.addEventListener('input',showSurface);
 const alternatives=el('div');body.append(alternatives);
 const upload=field(21,'input');upload.type='file';upload.accept='image/png';
 upload.addEventListener('change',()=>run(async()=>{
  const file=upload.files[0];if(!file)return;if(file.size>1048576)throw Error('reference_budget');
  const bytes=new Uint8Array(await file.slice(0,24).arrayBuffer());const h=new DataView(bytes.buffer);
  if(bytes.length<24||h.getUint32(0)!==0x89504e47||h.getUint32(4)!==0x0d0a1a0a||h.getUint32(12)!==0x49484452||h.getUint32(16)*h.getUint32(20)>4194304)throw Error('invalid_png');
  await analyze();const img=await createImageBitmap(file);
  try{const canvas=el('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),scale=64/Math.max(img.width,img.height),w=img.width*scale,h=img.height*scale;
   ctx.drawImage(img,(64-w)/2,(64-h)/2,w,h);const fp=signature(ctx.getImageData(0,0,64,64).data,64,64);
   for(const [i,f] of report.fingerprints.entries())line(t(22)+' '+(i+1)+' · '+Math.round(compare(fp,f.visual).structure*100)+'%');
  }finally{img.close();upload.value=''}
 }));
 body.append(note,comparison,output);labels.push([summary,0]);
 for(const x of [instruction,secondary,surface])x.addEventListener('input',cancel);
 return {render(s,l){lang=l;for(const [e,i] of labels)e.textContent=t(i);
  const next=[s.project?.id,s.project?.revision,s.assistant.selected,s.editor?.revision,s.editor?.selected,s.dirty].join('|');
  if(media.dataset.lang!==lang){const value=media.value;media.replaceChildren(...mediaLabels[lang].map((name,i)=>new Option(name,String(i))));media.value=value||'0';media.dataset.lang=lang}
  if(next!==key){showSurface();key=next;cancel();output.replaceChildren();report=null;secondary.replaceChildren(new Option('—',''),...(s.editor?.document.layers??[]).map(x=>new Option(x.id,x.id)));
   const m=getWorkspace()?.intelligence?.();alternatives.replaceChildren(...(m?.archives??[]).map(a=>{const b=el('button');b.type='button';b.textContent=a.name+' · v'+a.revision;b.addEventListener('click',()=>comparison.replaceChildren(picture(6,a.document),picture(7,getWorkspace().state().editor.document)));return b}));history.replaceChildren(new Option('0','0'),...(m?.events??[]).map((e,i)=>new Option((i+1)+' · '+e.instruction,String(i+1))));history.value=String(m?.cursor??0)}
  const disabled=s.busy||!s.project||s.dirty;for(const b of buttons.children)b.disabled=disabled;apply.disabled=reject.disabled=disabled||!pending;upload.disabled=disabled;note.textContent=!s.project?t(27):s.dirty?t(28):'';
 }};
}
