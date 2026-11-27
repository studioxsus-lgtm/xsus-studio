import {fingerprint} from './fingerprint.mjs';
import {compare} from './signature.mjs';

// Preserve order and seed. Retry only the duplicate slot and cap total work.
export async function diversify(variants,regenerate){
 const kept=[],marks=[];
 let retries=0;
 for(const [slot,initial] of variants.entries()){
  let variant=initial,fp=fingerprint(variant.document).mark;
  const near=()=>marks.some(m=>compare(m,fp).near);
  while(near()&&retries<6){
   const replacement=await regenerate(slot,++retries);
   if(!replacement)return null;
   variant=replacement;fp=fingerprint(variant.document).mark;
  }
  if(near())return null;
  kept.push(variant);marks.push(fp);
 }
 return kept;
}
