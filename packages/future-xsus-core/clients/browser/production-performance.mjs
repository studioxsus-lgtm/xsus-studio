import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {setTimeout as delay} from "node:timers/promises";

const base = "https://future-xsus-core-api.onrender.com";
const token = process.env.XSUS_TEST_USER_A_TOKEN;
if (process.env.XSUS_PRODUCTION_PROBE !== "true" || !token)
  throw new Error("Explicit probe opt-in and test-user token required");

async function probe(path, body) {
  const start = performance.now();
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: body ? {Authorization: "Bearer " + token, "Content-Type": "application/json"} : {},
    body: body ? JSON.stringify(body) : undefined,
    redirect: "error", signal: AbortSignal.timeout(15000)
  });
  const payload = await response.json();
  return {status: response.status, payload, ms: performance.now()-start};
}
const health = await probe("/healthz");
assert.equal(health.status, 200);
const scenarios = [];
let sequence = 0;
for (const concurrency of [1,2,4]) {
  const samples = [];
  const start = performance.now();
  for (let batch=0; batch<3; batch++) {
    const results = await Promise.all(Array.from({length:concurrency}, async()=>{
      const requestId = "prod-probe-" + (++sequence);
      const r = await probe("/v1/intelligence/reason", {
        contractVersion:"1.0.0",requestId,query:"done",facts:["done"],rules:[]
      });
      assert.equal(r.status, 200, "Probe stopped: unexpected HTTP status");
      assert.equal(r.payload.requestId, requestId);
      assert.equal(r.payload.contractVersion, "1.0.0");
      assert.equal(r.payload.status, "resolved");
      assert.equal(r.payload.answer, "done");
      assert.equal(r.payload.verifiedDerivation, true);
      assert.equal(r.payload.executionAuthorized, false);
      return r.ms;
    }));
    samples.push(...results);
    if(batch<2) await delay(1000);
  }
  const elapsed = performance.now()-start;
  samples.sort((a,b)=>a-b);
  const pct = p=>Number(samples[Math.ceil(p*samples.length)-1].toFixed(2));
  scenarios.push({concurrency,requests:samples.length,p50_ms:pct(.5),p95_ms:pct(.95),max_ms:pct(1),paced_requests_per_second:Number((samples.length*1000/elapsed).toFixed(2))});
}
assert.equal((await probe("/healthz")).status,200);
console.log(JSON.stringify({schema:"xsus-production-probe-v1",scenarios,requests:sequence,health_before_after:"pass",limitations:["small_sample","paced_probe_not_capacity_test","single_client_location"]},null,2));
