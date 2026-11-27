import {catalogIds,catalogVariants} from '../symbol-catalog.mjs';
import {fit,combine,regular,line,flatten,transform,area,box} from './contours.mjs';
import {procedure} from './procedural.mjs';
export const subjects={
 lion:['lion','luan','luani','luanin'],crown:['crown','crowns','couronne','kurorë','kurorën'],
 eagle:['eagle','aigle','shqiponjë','shqiponjën'],shield:['shield','bouclier','mburojë','mburojën'],
 mountain:['mountain','montagne','mal','mali'],sun:['sun','soleil','diell','diellin'],
 river:['river','rivière','lumë','lumi'],tree:['tree','arbre','pemë','pemën'],
 circuit:['circuit','electronic circuit','qark','qarqe'],network:['neural network','network','réseau neuronal','rrjet neural','rrjet nervor'],
 book:['book','livre','libër','libri'],bulb:['lightbulb','light bulb','bulb','ampoule','llambë','llambën'],
 heart:['heart','cœur','zemër','zemrën'],wave:['wave','pulse','onde','valë','puls']
};
export function shape(id,seed,detail){
 if(id==='lion'){
  const mane=procedure('radial',seed,3);
  const face=[[0,-52],[42,-32],[32,17],[11,51],[-11,51],[-32,17],[-42,-32]];
  return combine(combine(mane,[face],'cut'),[regular(3,13,0,6)]);
 }
 if(id==='crown')return [[[-94,-50],[-50,-10],[0,-74],[50,-10],[94,-50],[73,50],[-73,50]]];
 if(id==='eagle')return [[[-108,-63],[-37,-36],[2,-6],[24,-41],[55,-42],[73,-24],[43,-20],[27,8],[98,-38],[72,14],[33,33],[10,72],[-8,47],[-49,19],[-75,-4],[-44,5],[-85,-25]]];
 if(id==='mountain')return [[[-102,75],[-31,-62],[0,-22],[29,-86],[105,75]]];
 if(id==='river')return flatten([['M',-18,-90],['Q',60,-40,2,3],['Q',-42,48,50,91],['L',17,91],['Q',-77,50,-18,-4],['Q',28,-45,-32,-90],['Z']]);
 if(id==='sun')return [regular(32,75)];
 if(id==='network')return procedure('network',seed,detail);
 if(id==='circuit'){
  const pts=[[-65,-52],[-22,-12],[32,-12],[68,26]];
  return combine([...line(pts,12),...line([pts[1],[-22,45],[10,68]],9),...[pts[0],pts[3],[10,68]].map(([x,y])=>regular(12,12,x,y))]);
 }
 const key=({wave:'activity',bulb:'lightbulb'})[id]??id;
 if(!catalogIds.includes(key))throw Error('unknown_subject');
 return fit(combine(flatten(catalogVariants(key,'#000000','#ffffff')[0].document.layers[0].commands)),185,185);
}
export function fuse(base,parts,index,seed,detail){
 let mark=fit(base,224,211);
 for(const [i,id] of parts.entries()){
  const part=shape(id,seed+i,detail),step=(index+i)%3;
  const top=['bulb','sun','crown'].includes(id);
  const tool=fit(part,top?118:135,top?80:134,top?7:step*8,top?-81:9);
  const cut=combine(mark,tool,'cut');
  const visible=area(mark)-area(cut);
  if(step===2 && visible>area(tool)*.15)mark=cut;
  else if(step===1 && !top && visible>area(tool)*.15){
   const seam=transform(tool,(x,y)=>[x*1.12,y*1.12]);
   mark=combine(combine(mark,seam,'cut'),tool);
  }else mark=combine(mark,tool);
 }
 return mark;
}

export const fusionLayouts=['paired','stacked','diagonal','inset','crowned','linked'];
export function composeFusion(base,parts,index,seed,detail){
 if(!parts.length)return fit(base,218,205);
 if(parts.length>4)throw RangeError('symbol_budget');
 const mode=fusionLayouts[index%fusionLayouts.length];
 let mark=fit(base,mode==='paired'?112:mode==='stacked'?154:174,mode==='stacked'?108:174,mode==='paired'?-58:0,mode==='stacked'?48:0);
 for(const [i,id] of parts.entries()){
 const raw=shape(id,seed+i,detail),offset=(i-(parts.length-1)/2)*54;
 const [w,h,x,y]=mode==='paired'?[96,145,60,offset]:mode==='stacked'?[100,78,offset,-65]:mode==='diagonal'?[88,88,65+offset*.3,-65+offset*.3]:mode==='inset'?[82,82,offset,0]:mode==='crowned'?[84,66,offset,-99]:[100,100,65,offset];
 const tool=fit(raw,w,h,x,y);
 const seam=transform(tool,(a,b)=>[x+(a-x)*1.13,y+(b-y)*1.13]);
 const cut=combine(mark,seam,'cut');
 const candidate=combine(area(cut)>=area(mark)*.45?cut:mark,tool);
 if(area(candidate)>100)mark=candidate;
 }
 return fit(mark,218,205);
}
