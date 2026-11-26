import {normalizeDomain,inspectDNS} from './index.mjs';
import {inspectMailPolicies} from './mail.mjs';
import {discoverDomain} from './rdap.mjs';
import {expirationInfo} from './intelligence.mjs';
export function analyzeDNS(records){
 const findings=[];
 const add=(code,severity,evidence)=>findings.push({code,severity,evidence});
 for(const type of ['A','AAAA','NS','MX','CAA']){
  const r=records[type];
  if(!r||r.status==='unknown')add(type+'_UNVERIFIED','unknown',r?.code||null);
 }
 if(records.NS?.status==='resolved'){
  const ns=[...new Set(records.NS.values.map(x=>String(x).toLowerCase().replace(/\.$/,'')))];
  if(ns.length<2)add('NS_LOW_REDUNDANCY','warning',ns.length);
 }else if(records.NS?.status==='no_data')add('NS_MISSING','warning',null);
 if(['A','AAAA'].every(t=>records[t]?.status==='no_data'))add('NO_ADDRESS_RECORD','info',null);
 if(records.CAA?.status==='no_data')add('CAA_NOT_CONFIGURED','info',null);
 return findings;
}
export async function domainHealth(input,{dns=inspectDNS,mail=inspectMailPolicies,rdap=discoverDomain,now=Date.now()}={}){
 const domain=normalizeDomain(input);
 const results=await Promise.allSettled([dns(domain),mail(domain),rdap(domain)]);
 const [d,m,r]=results.map(x=>x.status==='fulfilled'?x.value:null);
 const findings=d?analyzeDNS(d.records):[{code:'DNS_UNVERIFIED',severity:'unknown'}];
 if(!m)findings.push({code:'MAIL_UNVERIFIED',severity:'unknown'});
 else for(const key of ['spf','dmarc']){
  if(m[key].status==='missing'||m[key].status==='multiple')findings.push({code:key.toUpperCase()+'_'+m[key].status.toUpperCase(),severity:'warning'});
  if(m[key].status==='unknown')findings.push({code:key.toUpperCase()+'_UNVERIFIED',severity:'unknown'});
 }
 const expiration=expirationInfo(r?.events||[],now);
 if(expiration.status==='expiring_soon'||expiration.status==='past_reported_expiration')findings.push({code:'REGISTRATION_TERM_WARNING',severity:'warning',evidence:expiration});
 if(!r||r.registrationStatus==='unknown')findings.push({code:'REGISTRATION_UNVERIFIED',severity:'unknown'});
 return {domain,checkedAt:new Date(now).toISOString(),dns:d,mail:m,registration:r,expiration,findings,coverage:results.filter(x=>x.status==='fulfilled').length+'/3',scope:'diagnostic_not_security_certification'};
}
