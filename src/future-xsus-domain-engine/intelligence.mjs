import {normalizeDomain} from './index.mjs';
export function scoreName(input) {
 const domain=normalizeDomain(input), label=domain.split('.')[0];
 const factors={brevity:Math.max(0,30-Math.max(0,label.length-6)*2), simplicity:label.includes('-')?10:25, digits:/\d/.test(label)?5:20, readability:label.startsWith('xn--')?10:25};
 return {domain,score:Object.values(factors).reduce((a,b)=>a+b,0),factors,method:'lexical_heuristic',marketValue:null};
}
export function suggestNames(words,{tld='com',limit=20}={}) {
 if(!Array.isArray(words)||words.length>20||!Number.isInteger(limit)||limit<1||limit>100||!/^[a-z]{2,63}$/i.test(tld)) throw new TypeError('Invalid options');
 const tokens=[...new Set(words.map(w=>{if(typeof w!=='string'||w.length>100)throw new TypeError('Invalid word');return w.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');}).filter(Boolean))];
 const candidates=new Set(tokens);
 for(const a of tokens)for(const b of tokens)if(a!==b){candidates.add(a+b);candidates.add(a+'-'+b);}
 return [...candidates].filter(x=>x.length<=63).map(x=>({...scoreName(x+'.'+tld),availability:'unknown'})).sort((a,b)=>b.score-a.score||a.domain.localeCompare(b.domain)).slice(0,limit);
}
export function expirationInfo(events,now=Date.now()){
 if(!Array.isArray(events)||!Number.isFinite(now))throw new TypeError('Invalid input');
 const dates=[...new Set(events.filter(e=>e?.action==='expiration').map(e=>Date.parse(e.date)).filter(Number.isFinite))];
 if(dates.length!==1)return {status:'unknown',reason:dates.length?'conflicting_dates':'missing_date'};
 const days=Math.ceil((dates[0]-now)/86400000);
 return {status:dates[0]<=now?'past_reported_expiration':days<=30?'expiring_soon':'active_reported_term',days,expiration:new Date(dates[0]).toISOString()};
}
