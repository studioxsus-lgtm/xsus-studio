const clamp=n=>Math.max(0,Math.min(1,n));
export function rankCreative(variants){
 if(!Array.isArray(variants)||variants.length>12)throw RangeError('ranking_budget');
 return variants.map((v,index)=>{
 const q=v.quality??{},p=q.pixel;
 if(!p||![p.coverage,p.centerOffset,p.edgeInk,p.width,p.height].every(Number.isFinite))return {index,score:null,eligible:false,reasons:['missing_measurements']};
 const reasons=[...new Set([...(p.warnings??[]),...(q.heuristics?.review??[])])];
 const balance=clamp(1-p.centerOffset/.5),coverage=clamp(Math.min(p.coverage/.12,(1-p.coverage)/.35)),edges=clamp(1-p.edgeInk/Math.max(1,p.width+p.height));
 const contrast=q.contrast?.length?Math.max(...['onWhite','onBlack'].map(k=>Math.min(...q.contrast.map(c=>c[k])))):null;
 const components={balance,coverage,edges,contrast:contrast===null?null:clamp(contrast/4.5),layout:reasons.includes('overlapping_text_bounds')?.35:1};
 const weights={balance:2,coverage:2,edges:2,contrast:2,layout:2};
 const available=Object.keys(components).filter(k=>Number.isFinite(components[k]));
 const score=Math.round(100*available.reduce((s,k)=>s+components[k]*weights[k],0)/available.reduce((s,k)=>s+weights[k],0));
 return {index,score,eligible:p.acceptable===true,reasons,components};
 }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||(b.score??-1)-(a.score??-1)||a.index-b.index);
}
export function attachCreativeRanking(kit){
 const ranking=rankCreative(kit.variants);
 return {...kit,creativeRanking:{version:'5.1.0',method:'measured-heuristic',recommendedIndex:ranking.find(r=>r.eligible)?.index??null,ranking}};
}
