import {normalizeDomain} from './index.mjs';
import {expirationInfo} from './intelligence.mjs';
export function analyzePortfolio(accountId,entries,{now=Date.now(),alertDays=30}={}){
 if(typeof accountId!=='string'||!accountId.trim()||!Array.isArray(entries)||entries.length>10000||!Number.isFinite(now)||!Number.isInteger(alertDays)||alertDays<1||alertDays>365)throw new TypeError('Invalid portfolio');
 const seen=new Set(),domains=[],alerts=[];
 for(const entry of entries){
 if(entry?.accountId!==accountId)throw new Error('Portfolio scope mismatch');
 const domain=normalizeDomain(entry.domain);
 if(seen.has(domain))throw new Error('Duplicate domain');
 seen.add(domain);
 const expiration=expirationInfo(entry.events??[],now);
 const item={domain,tld:domain.split('.').at(-1),expiration,controlStatus:entry.controlStatus==='verified'?'previously_verified':'unverified'};
 domains.push(item);
 if(expiration.status==='unknown')alerts.push({domain,code:'EXPIRATION_UNKNOWN'});
 else if(expiration.days<=alertDays)alerts.push({domain,code:expiration.status==='past_reported_expiration'?'REPORTED_TERM_ENDED':'RENEWAL_REVIEW',days:expiration.days});
 }
 const byTld=Object.create(null);
 for(const d of domains)byTld[d.tld]=(byTld[d.tld]??0)+1;
 return {accountId,total:domains.length,byTld,domains,alerts,checkedAt:new Date(now).toISOString(),automaticRenewal:false};
}
