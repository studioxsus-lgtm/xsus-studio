import assert from "node:assert/strict";
const base="https://future-xsus-core-api.onrender.com";
async function request(path,options={}) {
  return fetch(base+path,{...options,redirect:"error",signal:AbortSignal.timeout(15000)});
}
const health=await request("/healthz");
assert.equal(health.status,200);
await health.body?.cancel();
for(const headers of [{},{Authorization:"Bearer invalid-smoke-token"}]){
  const response=await request("/v1/sessions",{headers});
  assert.equal(response.status,401);
  await response.body?.cancel();
}
const denied=await request("/v1/sessions",{method:"OPTIONS",headers:{
  Origin:"https://untrusted.example","Access-Control-Request-Method":"GET",
  "Access-Control-Request-Headers":"authorization"
}});
assert.equal(denied.status,403);
assert.equal(denied.headers.get("Access-Control-Allow-Origin"),null);
await denied.body?.cancel();
console.log(JSON.stringify({health:"pass",anonymous_denial:"pass",invalid_token_denial:"pass",untrusted_cors:"pass",authenticated_identity:"not_tested",production_ready:false}));
