// Configuration-only preflight. Never logs secrets, connects to Supabase or enables deployment.
const REQUIRED=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'];
export function inspectSupabaseReadiness(env={}) {
 const missing=REQUIRED.filter(key=>typeof env[key]!=='string'||!env[key].trim());
 const url=env.SUPABASE_URL;
 let validUrl=false;
 try {
  const parsed=new URL(url);
  validUrl=parsed.protocol==='https:' && /^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) &&
    !parsed.username && !parsed.password && !parsed.search && !parsed.hash && parsed.pathname==='/';
 } catch {}
 const issues=[...missing.map(key=>key+'_MISSING')];
 if(!missing.includes('SUPABASE_URL')&&!validUrl) issues.push('SUPABASE_URL_INVALID');
 if(env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY &&
    env.SUPABASE_ANON_KEY===env.SUPABASE_SERVICE_ROLE_KEY) issues.push('KEYS_NOT_DISTINCT');
 // Configuration is necessary but never sufficient for safe DB access.
 return Object.freeze({configured:issues.length===0,authorized:false,artifactsVerified:false,
  deploymentEnabled:false,issues:Object.freeze(issues)});
}
