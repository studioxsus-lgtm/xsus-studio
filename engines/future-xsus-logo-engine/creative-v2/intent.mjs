import {classify,fold} from './industries.mjs';
import {subjects} from './fusion.mjs';
import {catalogRequest,catalogIds} from '../symbol-catalog.mjs';
export const inks={black:'#14151b',gold:'#b28a3e',blue:'#2563eb',deepBlue:'#142857',white:'#ffffff',violet:'#743cd3',green:'#23704e',red:'#bb3441'};
const colors={black:['black','noir','noire','zezë'],gold:['gold','golden','doré','or','artë','ari'],deepBlue:['deep blue','navy blue','dark blue','bleu profond','bleu marine','blu e thellë','blu e errët'],blue:['blue','bleu','blu'],white:['white','blanc','blanche','bardhë'],violet:['violet','violette','vjollcë'],green:['green','vert','gjelbër'],red:['red','rouge','kuqe']};
function matches(text,vocab){
 const hay=' '+fold(text)+' ';
 return Object.entries(vocab).map(([id,names])=>({id,i:Math.min(...names.map(n=>{const at=hay.indexOf(' '+fold(n)+' ');return at<0?Infinity:at}))})).filter(x=>Number.isFinite(x.i)).sort((a,b)=>a.i-b.i).map(x=>x.id);
}
export function options(value){
 if(!value||value.version!=='2.0.0'||Object.keys(value).some(k=>!['version','seed','count','slot','revision'].includes(k)))throw TypeError('invalid_creative_options');
 if(value.count!==undefined&&![3,6,9,12].includes(value.count))throw TypeError('invalid_count');
 for(const k of ['seed','revision','slot'])if(value[k]!==undefined&&(!Number.isSafeInteger(value[k])||value[k]<0||value[k]>(k==='slot'?11:2147483647)))throw TypeError('invalid_'+k);
 if(value.slot!==undefined&&value.slot>=(value.count??12))throw TypeError('invalid_slot');
 return value;
}
export function interpret(prompt,brief,opts){
 options(opts);
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>4000||typeof brief?.name!=='string'||!brief.name.trim()||[...brief.name].length>80)throw TypeError('invalid_brief');
 const selector=prompt.match(/\n\[XSUS symbol: ([a-z0-9-]+)\]$/);
 const text=prompt.replace(/\n\[XSUS symbol: [a-z0-9-]+\]$/,'').normalize('NFC');
 // Quoted names are labels; unquoted letters and monograms remain available to the parser.
 const description=text.replace(/["“«]([^"”»]+)["”»]/gu,(s,n)=>n===brief.name?' ':s);
 const positive=[],excluded=[];
 for(const clause of description.replace(/sans[ -]serif/giu,'sans-serif').split(/[.,;\n]|\b(?:but|por|mais)\b/iu)){
  const [head,...tails]=clause.split(/(?:\bwithout|\bavoid|\bexclude|\bno|\bsans|éviter|exclure|\bpa|shmang|mos përdor)\s+/iu);
  positive.push(head);
  for(const tail of tails){const [block,...resume]=tail.split(/\b(?:using|with|avec|en utilisant|duke përdorur|me një)\b/iu);
   excluded.push(...block.split(/\s+(?:or|and|et|ou|dhe|ose)\s+/iu));positive.push(...resume)}
 }
 const wanted=positive.join(' '),forbidden=new Set(),unknown=[];
 for(const block of excluded){
  const deny=[...matches(block,subjects),...matches(block,colors)];
  const catalog=catalogRequest(block,brief.name);if(catalog)deny.push(catalog);
  if(!deny.length&&block.trim())unknown.push(block);
  for(const item of deny)forbidden.add(item);
 }
 const profile=classify(wanted,brief.industry);
 const letters=wanted.match(/(?:monogram(?:me|in)?|initials?|initiales?|letters?|lettres?|shkronj(?:a|at|ën|ë)|number|chiffre|numër)\s*[:=]?\s*["'«“]?([A-Za-zËÇëç0-9]{1,5})(?![\p{L}\p{N}])/iu)??wanted.match(/(?:^|\s)([A-ZËÇ0-9]{1,5})\s*\+/u);
 const glyphs=letters&&!/^(and|with|avec|for|the|logo|pour|për|des|une|les)$/iu.test(letters[1])?letters[1]:null;
 const required=matches(wanted,subjects).filter(k=>!forbidden.has(k));
 const picked=selector?.[1]??catalogRequest(wanted,brief.name);
 const vocab={
  style:{luxury:['luxury','luxe','luxueux','luksoz'],minimal:['minimal','minimalist','minimaliste'],abstract:['abstract','abstrait','abstrakt'],angular:['angular','angulaire','këndor'],rounded:['rounded','arrondi','rrumbullakosur'],futuristic:['futuristic','futuriste','futurist']},
  usage:{app:['mobile','app icon','aplikacion'],print:['print','business cards','impression','shtyp'],web:['website','web','faqe']},
  audience:{children:['children','enfants','fëmijë'],enterprise:['enterprise','entreprises','biznese'],premium:['premium','luxury','luxe','luksoz']},
  mood:{calm:['calm','calme','qetë'],energetic:['energetic','énergie','energji'],trust:['trust','confiance','besim']},
  layout:{horizontal:['horizontal','horizontale'],stacked:['stacked','vertikal','empilé'],icon:['icon only','symbol only','vetëm simbol','symbole seul']},
  typography:{sans:['sans-serif','sans serif'],serif:['serif','empattements'],bold:['bold','gras','trashë']}
 };
 const traits=Object.fromEntries(Object.entries(vocab).map(([k,v])=>[k,matches(wanted,v)]));
 const numbers={three:3,tri:3,trois:3,six:6,gjashtë:6,nine:9,neuf:9,nëntë:9,twelve:12,douze:12,dymbëdhjetë:12};
 const counted=wanted.replace(/(three|tri|trois|six|gjashtë|nine|neuf|nëntë|twelve|douze|dymbëdhjetë)(?=\s+(?:[\p{L}-]+\s+){0,5}(?:variant|concept|logo|koncep))/giu,w=>numbers[w.toLowerCase()]);
 return {required,forbidden:[...forbidden],unknown,glyphs,profile,traits,colors:matches(wanted,colors).filter(k=>!forbidden.has(k)&&!(k==='blue'&&matches(wanted,colors).includes('deepBlue'))),
  selected:picked&&catalogIds.includes(picked)&&!forbidden.has(picked)?picked:null,explicit:!!selector,
  count:opts.count??Number(counted.match(/\b(12|9|6|3)\s+(?:[\p{L}-]+\s+){0,5}(?:variant|concept|logo|koncep)/iu)?.[1]??3),
  complexity:/detail|complex|détail|hollësi/i.test(wanted)?3:/minimal|simple|thjesht/i.test(wanted)?1:2,
  family:matches(wanted,{radial:['radial','radiale'],organic:['organic','organique','organik'],fractal:['fractal','fraktal'],spiral:['spiral','spirale'],modular:['modular','modulaire'],network:['network','réseau','rrjet'],polygon:['polygon','polygone','poligon']})[0],
  negative:/negative space|espace n.gatif|hap.sir. negative/iu.test(wanted),open:/open contour|contour ouvert|kontur t. hapur/iu.test(wanted),
  mirror:/mirror|miroir|pasqyr/iu.test(wanted),culture:wanted.match(/(?:inspired by|inspiré de|frymëzuar nga)\s+([^.;]{1,48})/iu)?.[1]?.trim()};
}
