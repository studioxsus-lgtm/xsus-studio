import {architecturalMark,structuralQuality,architectures} from './architecture.mjs';
import {createHash} from 'node:crypto';
import {contrast,textColor} from '../design.mjs';
import {interpret,inks} from './intent.mjs';
import {monogram} from './alphabet.mjs';
import {shape,fuse,composeFusion} from './fusion.mjs';
import {random,procedure,families} from './procedural.mjs';
import {fit,combine,line,regular,transform,layer,similarity} from './contours.mjs';
import {verify} from './quality.mjs';
const hash=s=>createHash('sha256').update(s).digest().readUInt32BE()>>>1;
const review=reason=>({status:'review_required',reasons:[reason]});
function vary(base,mode,rng){
 if(mode===1)return combine([regular(4+Math.floor(rng()*4),145,0,0,rng()*.6)],fit(base,161,157),'cut');
 if(mode===2)return combine(base,line([[-110,62],[-6,7],[109,-60]],6+rng()*8),'cut');
 if(mode===3)return combine(base,transform(base,(x,y)=>[x*.78+10,y*.78]),'cut');
 if(mode===4)return combine(transform(base,(x,y)=>[x*.84-16,y*.84+5]),transform(base,(x,y)=>[x*.84+16,y*.84-5]));
 if(mode===5)return combine(combine([regular(6,135)],[regular(6,118)],'cut'),fit(base,216,206));
 return base;
}
export async function composeCreative({prompt,language,brief,strategy,creative}){
 const intent=interpret(prompt,brief,creative);
 if(intent.unknown.length)return review('unsupported_exclusion');
 if(intent.required.length>5)return review('symbol_budget');
 const profile=intent.profile,seed=creative.seed??hash(language+'|'+prompt),revision=creative.revision??0;
 if(creative.slot!==undefined&&creative.slot>=intent.count)throw RangeError('invalid_slot');
 const style=intent.traits.style[0]??(intent.traits.audience.includes('children')?'rounded':profile?.typography??'minimal');
 const banned=new Set(intent.forbidden.map(k=>inks[k]).filter(Boolean));
 const ink=inks[intent.colors[0]]??strategy.primary??brief.primary??profile?.primary??'#304573';
 const primary=banned.has(ink)?['#324975','#246647'].find(c=>!banned.has(c)):ink;
 const second=inks[intent.colors[1]]??strategy.secondary??profile?.secondary??textColor(primary);
 const secondary=banned.has(second)?primary:second;
 const first=intent.required[0]??(intent.explicit?intent.selected:intent.family?null:profile?.symbol??intent.selected);
 const baseId=intent.forbidden.includes(first)?null:first;
 const variants=[],signatures=[];
 const slots=creative.slot===undefined?Array.from({length:intent.count},(_,i)=>i):[creative.slot];
 for(const slot of slots){
  let chosen;
  for(let attempt=0;attempt<10&&!chosen;attempt++){
   const index=slot+13*attempt+revision,stamp=hash([seed,index,revision].join('|')),rng=random(stamp);
   const family=intent.family??profile?.family??(intent.traits.mood.includes('calm')?'organic':families[index%families.length]);
   let mark,parts=intent.required.slice(1);
   const architectural=!intent.glyphs&&!intent.required.length&&!intent.explicit&&!intent.family&&!intent.negative&&!intent.forbidden.length;
   if(intent.glyphs){
    const mode=intent.open?'open':intent.mirror?'mirror':['woven','ligature','open','woven'][index%4];
    mark=await monogram(intent.glyphs,style,mode);parts=intent.required;
   }else if(architectural)mark=architecturalMark(index,stamp);
   else mark=baseId?shape(baseId,stamp,intent.complexity):procedure(family,stamp,intent.complexity);
   mark=parts.length?(intent.negative?fuse(mark,parts,index,stamp,intent.complexity):composeFusion(mark,parts,index,stamp,intent.complexity)):fit(mark,218,205);
   const mode=(index+(profile?.composition==='linked'?2:0))%6;
   if(intent.negative)mark=combine([regular(6+index%5,145)],fit(mark,158,151),'cut');
   if(!architectural&&!parts.length)mark=vary(mark,mode,rng);if(!mark.length)continue;
   if(architectural&&!structuralQuality(mark).acceptable)continue;
   const rngSkew=(rng()-.5)*.22;
   const signature=fit(transform(mark,(x,y)=>[x+y*rngSkew,y]),180,180);
   if(signatures.some(other=>similarity(signature,other)>.94))continue;
   const horizontal=intent.traits.layout.includes('horizontal')||(!intent.traits.layout.length&&strategy.design?.layout==='horizontal'&&index%3===1);
   const icon=intent.traits.layout.includes('icon');
   const cx=horizontal?108:256,cy=icon||horizontal?256:209;
   const final=fit(signature,horizontal?169:246,horizontal?180:234,cx,cy);
   try{
    let layers=[layer('creative-mark',final,primary)];
    if(secondary!==primary && (intent.colors.length>1||index%2===1) && contrast(primary,secondary)>=1.4){
     const mask=[[[cx-146,cy+62],[cx+146,cy-31],[cx+146,cy+155],[cx-146,cy+155]]];
     const cut=combine(final,mask,'cut'),accent=combine(final,mask,'intersect');
     if(cut.length && accent.length)layers=[layer('creative-mark',cut,primary),layer('creative-accent',accent,secondary)];
    }
    if(!icon){
     const fontSize=Math.min(32+index%4*3,(horizontal?268:426)/Math.max(1,brief.name.length));
     layers.push({id:'brand-name',type:'text',text:brief.name,x:horizontal?356:256,y:horizontal?266:398+index%3*9,fontSize,fill:primary,
      fontFamily:intent.traits.typography.includes('sans')?'sans-serif':style==='luxury'||intent.traits.typography.includes('serif')?'serif':index%4===3?'monospace':'sans-serif',
      fontWeight:intent.traits.typography.includes('bold')?700:[500,600,700][index%3]});
    }
    const document={version:'1.0.0',width:512,height:512,layers,creative:{version:'2.0.0',seed,slot,count:intent.count,revision,attempt,
     brief:prompt,language,name:brief.name,family,style,mode,...(architectural?{architecture:architectures[index%architectures.length]}:{}),complexity:intent.complexity,subjects:intent.required,...(intent.glyphs?{glyphs:intent.glyphs}:{}),category:profile?.id??null,
     audience:intent.traits.audience,mood:intent.traits.mood,culture:intent.culture,usage:intent.traits.usage}};
    const checked=verify(final,document,primary,textColor(primary));
    chosen={symbol:'creative-'+slot,document,...checked};signatures.push(signature);
   }catch(error){if(error.message!=='path_budget')throw error}
  }
  if(!chosen)return review('creative_constraints');variants.push(chosen);
 }
 return {status:'generated',kit:{version:'2.0.0',name:brief.name,seed,variants,palette:{primary,secondary}}};
}
