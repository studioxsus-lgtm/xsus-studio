import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {contrast,textColor} from './design.mjs';

const paths=JSON.parse(gunzipSync(readFileSync(new URL('./symbols/bootstrap-icons-1.13.1.json.gz',import.meta.url))));
export const catalogIds=Object.freeze(Object.keys(paths).sort());
const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const aliases={
 rocket:['raketë','raketën','raketa','fusée'], tree:['pemë','pemën','arbre'], heart:['zemër','zemrën','cœur'],
 airplane:['avion','avionin'], trophy:['trofe','trophée'], gem:['diamant','gur i çmuar'],
 rainbow:['ylber','arc en ciel'], key:['çelës','çelësin','clé'], compass:['busull','busullën','boussole'],
 moon:['hënë','hënën','lune'], sun:['diell','diellin','soleil'], hourglass:['orë rëre','sablier'],
 pencil:['laps','crayon'], scissors:['gërshërë','ciseaux'], hammer:['çekiç','marteau'], bell:['kambanë','cloche'],
 umbrella:['çadër','parapluie'], balloon:['balonë','ballon'], lightbulb:['llambë','ampoule'],
 headphones:['kufje','écouteurs'], globe:['glob','globe terrestre'], shield:['mburojë','bouclier'],
 gift:['dhuratë','cadeau'], suitcase:['valixhe','valise'], wallet:['portofol','portefeuille'],
 lightning:['rrufe','éclair'], snow:['borë','neige'], watch:['orë dore','montre'], truck:['kamion','camion']
};
const phrases=new Map();
for(const id of catalogIds){
 for(const term of [id.replaceAll('-',' '),...(aliases[id]??[])])phrases.set(normalize(term),id);
}
export function catalogRequest(prompt,name){
 const selector=prompt.match(/\n\[XSUS symbol: ([a-z0-9-]+)\]$/);
 if(selector && Object.hasOwn(paths,selector[1]))return selector[1];
 const words=normalize(prompt.split(name).join(' ')).match(/[\p{L}\p{N}]+/gu)??[];
 for(let length=Math.min(6,words.length);length>0;length--){
  for(let i=0;i+length<=words.length;i++){
   const id=phrases.get(words.slice(i,i+length).join(' '));
   if(id)return id;
  }
 }
 return null;
}

export function catalogVariants(id,primary,secondary){
 const source=paths[id];
 const ink=contrast(primary,secondary)>=3?secondary:textColor(primary);
 function mark(scale,fill){
  const commands=source.map(([op,...coords])=>[op,...coords.map((n,i)=>{
   const center=i%2?223:256;
   return Math.round((center+(n-center)*scale)*10)/10;
  })]);
  return {type:'path',commands,fill};
 }
 const badge={type:'circle',cx:256,cy:223,r:135,fill:primary};
 const tile={type:'polygon',points:[[256,81],[398,223],[256,365],[114,223]],fill:primary};
 return [[mark(1,primary)],[badge,mark(.72,ink)],[tile,mark(.55,ink)]].map((layers,i)=>({
  symbol:'catalog-'+id+'-'+(i+1),document:{version:'1.0.0',width:512,height:512,layers}
 }));
}
