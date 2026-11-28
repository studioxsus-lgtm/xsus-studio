export function conceptDirection(intent,prompt=''){
 const t=intent.traits??{},tech=t.style?.includes('futuristic')||/artificial intelligence|intelligence artificielle|inteligjenc[ëa] artificiale|technology|technologie|teknologji/i.test(prompt);
 return tech?{domain:'technology',directions:['signal','axis','network','flow','aperture','connection']}:{domain:'general',directions:[]};
}
