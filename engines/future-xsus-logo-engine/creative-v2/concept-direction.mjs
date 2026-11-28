const domains=[
 ['technology',/artificial intelligence|intelligence artificielle|inteligjenc[ëa] artificiale|technology|technologie|teknologji/i,['signal','axis','network','flow','aperture','connection']],
 ['health',/healthcare|medical|clinic|santé|clinique|shëndet|klinik/i,['connection','flow','aperture','axis','network','signal']],
 ['finance',/finance|banking|investment|banque|financ|investim/i,['axis','signal','connection','network','aperture','flow']],
 ['education',/education|school|university|éducation|école|arsim|shkoll/i,['signal','connection','axis','aperture','flow','network']],
 ['environment',/sustainab|ecology|environment|écologie|mjedis|ekologji/i,['flow','aperture','connection','network','signal','axis']],
 ['hospitality',/hotel|restaurant|hospitality|hôtel|restorant|mikprit/i,['aperture','flow','axis','connection','signal','network']]
];
export function conceptDirection(intent,prompt=''){
 const match=domains.find(([,pattern])=>pattern.test(prompt))??(intent.traits?.style?.includes('futuristic')?domains[0]:null);
 return match?{domain:match[0],directions:[...match[2]]}:{domain:'general',directions:[]};
}
