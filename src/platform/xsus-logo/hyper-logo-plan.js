const HEX = /^#[0-9a-f]{6}$/i;
const palettes = Object.freeze({technology:['#2563eb','#ffffff'],food:['#b45309','#ffffff'],finance:['#1e3a8a','#ffffff'],health:['#047857','#ffffff'],general:['#a21caf','#ffffff']});
function luminance(hex) {
  const rgb = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
}
export function planLogo(request) {
  if (!request || request.version!=='1.0.0' || request.operation!=='logo.plan' || typeof request.requestId!=='string' || !/^[A-Za-z0-9_-]{1,80}$/.test(request.requestId)) throw new TypeError('Invalid logo contract');
  const b=request.brief;
  if (!b || typeof b.name!=='string' || b.name.length>120) throw new TypeError('Invalid brand brief');
  for (const k of ['primary','secondary']) if (b[k]!=null && (typeof b[k]!=='string'||!HEX.test(b[k]))) throw new TypeError('Invalid palette');
  const industry=Object.hasOwn(palettes,b.industry)?b.industry:'general';
  const [p,s]=palettes[industry];
  const primary=b.primary??p, secondary=b.secondary??s;
  const a=luminance(primary), z=luminance(secondary);
  const contrast=(Math.max(a,z)+0.05)/(Math.min(a,z)+0.05);
  const reasons=[];
  if (!b.name.trim()) reasons.push('missing_brand_name');
  if (contrast<3) reasons.push('low_palette_contrast');
  const style=['modern','minimal','classic','luxury'].includes(b.style)?b.style:'modern';
  return {version:'1.0.0',requestId:request.requestId,review_required:reasons.length>0,approved:reasons.length===0,reasons,primary,secondary,contrast,industry,style,typography:style==='classic'||style==='luxury'?'serif':'sans-serif',symbol:industry==='technology'?'geometric':industry==='health'?'organic':'abstract'};
}
