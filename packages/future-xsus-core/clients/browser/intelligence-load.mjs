import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
const base = process.env.XSUS_TEST_API_URL;
const token = process.env.XSUS_API_TOKEN;
if (!base || !token) throw new Error("Missing test configuration");
const url = new URL(base);
assert.ok(url.protocol === "http:" && url.hostname === "127.0.0.1", "Loopback test only");

async function request(id) {
  const start = performance.now();
  const query = "done";
  const res = await fetch(new URL("/v1/intelligence/reason", url), {
    method: "POST", headers: {Authorization: "Bearer " + token, "Content-Type": "application/json"},
    body: JSON.stringify({contractVersion: "1.0.0", requestId: "load-" + id,
      query, facts: ["start"], rules: [{premises: ["start"], conclusion: query}]}),
    signal: AbortSignal.timeout(10000)
  });
  const body = await res.json();
  if (res.status === 200) {
    assert.equal(body.requestId, "load-" + id);
    assert.equal(body.answer, query);
    assert.equal(body.verifiedDerivation, true);
    assert.equal(body.executionAuthorized, false);
  } else {
    assert.equal(res.status, 503);
    assert.equal(body.error.code, "intelligence_unavailable");
  }
  return {status: res.status, ms: performance.now() - start};
}

const scenarios = [];
let id = 0;
for (const concurrency of [1, 4, 8, 16, 32]) {
  const samples = [];
  const start = performance.now();
  for (let batch = 0; batch < 8; batch++) {
    samples.push(...await Promise.all(Array.from({length: concurrency}, () => request(++id))));
  }
  const elapsed = performance.now() - start;
  const ok = samples.filter(x => x.status === 200);
  const latency = ok.map(x => x.ms).sort((a,b) => a-b);
  assert.ok(ok.length > 0);
  if (concurrency === 1) assert.equal(ok.length, samples.length);
  const percentile = p => Number(latency[Math.ceil(p * latency.length)-1].toFixed(2));
  scenarios.push({concurrency, requests: samples.length, completed: ok.length,
    unavailable: samples.length-ok.length, p50_ms: percentile(.5), p95_ms: percentile(.95),
    p99_ms: percentile(.99), successful_requests_per_second: Number((ok.length*1000/elapsed).toFixed(2))});
}
assert.equal((await request(++id)).status, 200, "Service must recover after load");
console.log(JSON.stringify({scenarios, recovery: "pass", environment: "CI loopback; not production"}, null, 2));
