import { normalizeDomain, inspectDNS } from './index.mjs';
export async function inspectMailSecurity(input,{inspect=inspectDNS}={}) {
 const domain=normalizeDomain(input);
 const root=await inspect(domain,{types:['TXT','MX']});
 const txt=(r)=>r?.status==='resolved'?r.values.map(v=>Array.isArray(v)?v.join(''):String(v)):null;
 const spf=txt(root.records.TXT);
 const policies=spf?.filter(x=>/^v=spf1(?:\s|$)/i.test(x));
 return {domain,spf:policies?{status:policies.length===1?'present':policies.length>1?'multiple':'missing'}:{status:root.records.TXT.status==='no_data'?'missing':'unknown'},mx:root.records.MX.status,dmarc:{status:'unknown',reason:'requires underscore-aware DNS lookup'}};
}
