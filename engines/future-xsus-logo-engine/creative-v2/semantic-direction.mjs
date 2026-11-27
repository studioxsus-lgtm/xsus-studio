import {architectures} from './architecture.mjs';
export function semanticDirections(intent){
 const t=intent.traits??{}, has=(k,v)=>t[k]?.includes(v);
 const order=has('style','luxury')||has('audience','premium')?['crown','interlock','compass']:has('style','futuristic')?['orbit','lattice','aperture']:has('mood','trust')||has('audience','enterprise')?['interlock','compass','lattice']:has('mood','energetic')?['chevron','ribbon','aperture']:has('mood','calm')||has('audience','children')?['orbit','ribbon','interlock']:has('style','minimal')?['compass','chevron','interlock']:[];
 const family=intent.profile?.family;
 const industry={network:['lattice','orbit'],radial:['aperture','compass'],organic:['ribbon','orbit'],modular:['interlock','lattice'],spiral:['orbit','aperture'],polygon:['compass','chevron'],fractal:['lattice','crown']}[family]??[];
 return [...new Set([...order,...industry,...architectures])];
}
