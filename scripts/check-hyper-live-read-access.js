/**
 * Live, read-only Supabase evidence table access check.
 * Distinguishes actual successful GETs from fail-closed authorization denials.
 * Does not read rows, write data, expose secrets, or enable runtime.
 */
const tables=["hyper_evidence_owners","hyper_runtime_evidence_bundles"];
async function main(){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  let parsed;
  try { parsed=new URL(url); } catch {return {ok:false,code:"CONFIG_INVALID"};}
  if(parsed.protocol!=="https:" || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) ||
     parsed.pathname!=="/" || parsed.search || parsed.hash || parsed.port ||
     typeof key!=="string" || !key.trim())return {ok:false,code:"CONFIG_INVALID"};
  const results=[];
  for(const table of tables){
    try {
      const response=await fetch(parsed.origin+"/rest/v1/"+table+"?select=observation_id&limit=0",{
        method:"GET",redirect:"error",signal:AbortSignal.timeout(10000),
        headers:{apikey:key,Authorization:"Bearer "+key,Accept:"application/json"}
      });
      if(!response.ok)return {ok:false,code:"TABLE_READ_UNAVAILABLE",table};
      const rows=await response.json();
      if(!Array.isArray(rows))return {ok:false,code:"INVALID_TABLE_RESPONSE",table};
      results.push(table);
    }catch{return {ok:false,code:"TABLE_READ_UNAVAILABLE",table};}
  }
  return {ok:true,code:"LIVE_READ_ACCESS_CONFIRMED",tablesChecked:results.length,
    positiveOwnerVerified:false,macPersistenceVerified:false,productionEligible:false};
}
const result=await main();
process.stdout.write(JSON.stringify(result)+"\n");
if(!result.ok)process.exitCode=1;
