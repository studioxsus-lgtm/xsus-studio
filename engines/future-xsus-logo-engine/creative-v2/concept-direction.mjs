const domains=[
 ['fashion',/fashion|couture|mode de luxe|mod[ëa] luksoze|luxury brand/i,['atelier','silk','halo','ribbon-loop','facet','prism']],
 ['technology',/artificial intelligence|intelligence artificielle|inteligjenc[ëa] artificiale|technology|technologie|teknologji/i,['vector-core','quantum','circuit','axis','network','connection']],
 ['health',/healthcare|medical|clinic|santé|clinique|shëndet|klinik/i,['pulse','connection','flow','axis','network','signal']],
 ['finance',/finance|banking|investment|banque|financ|investim/i,['bridge','axis','connection','network','aperture','flow']],
 ['education',/education|school|university|éducation|école|arsim|shkoll/i,['signal','connection','axis','aperture','flow','network']],
 ['environment',/sustainab|ecology|environment|écologie|mjedis|ekologji/i,['botanical','leaf-pair','prism','flow','connection','network']],
 ['hospitality',/hotel|restaurant|hospitality|hôtel|restorant|mikprit/i,['aperture','flow','axis','connection','signal','network']]
];
export function conceptDirection(intent,prompt=''){
 const match=domains.find(([,pattern])=>pattern.test(prompt))??(intent.traits?.style?.includes('futuristic')?domains.find(([name])=>name==='technology'):null);
 return match?{domain:match[0],directions:[...match[2]]}:{domain:'general',directions:[]};
}
