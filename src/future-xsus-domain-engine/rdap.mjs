import { normalizeDomain } from './index.mjs';
const BOOTSTRAP='https://data.iana.org/rdap/dns.json';
async function request(url, fetcher) {
  return fetcher(url,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{accept:'application/rdap+json, application/json'}});
}
export async function discoverDomain(input,{fetcher=fetch}={}) {
  const domain=normalizeDomain(input);
  const unknown=(reason)=>({domain,registrationStatus:'unknown',availability:'unknown',reason});
  try {
    const bootstrap=await request(BOOTSTRAP,fetcher);
    if(!bootstrap.ok) return unknown('bootstrap_unavailable');
    const data=await bootstrap.json();
    const tld=domain.split('.').at(-1);
    const service=data.services.find(s=>s[0].includes(tld));
    const base=service?.[1].find(x=>x.startsWith('https://'));
    if(!base) return unknown('unsupported_tld');
    const url=new URL('domain/'+encodeURIComponent(domain),base.endsWith('/')?base:base+'/');
    const response=await request(url,fetcher);
    if(response.status===404) return {domain,registrationStatus:'not_found',availability:'unknown',source:url.href};
    if(!response.ok) return unknown('rdap_http_'+response.status);
    const body=await response.json();
    if(body.objectClassName!=='domain'||normalizeDomain(body.ldhName||body.unicodeName)!==domain) return unknown('invalid_response');
    return {domain,registrationStatus:'registered',availability:'unavailable',source:url.href,status:Array.isArray(body.status)?body.status:[],events:Array.isArray(body.events)?body.events.map(e=>({action:e.eventAction,date:e.eventDate})):[]};
  } catch {return unknown('lookup_failed');}
}
