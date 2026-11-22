import test from "node:test";
import assert from "node:assert/strict";
import { createXsusCoreClient } from "./xsus-core-client.js";

const input = { requestId: "r1", query: "done", facts: ["done"], rules: [] };
const valid = { contractVersion: "1.0.0", requestId: "r1", status: "resolved",
  answer: "done", verifiedDerivation: true, executionAuthorized: false, limitations: [] };

function client(payload, check = () => {}) {
  return createXsusCoreClient({ baseUrl: "https://example.com", getAccessToken: async () => "token",
    fetchImpl: async (url, options) => {
      check(url, options);
      return { status: 200, ok: true, json: async () => payload };
    } });
}

test("authenticated reasoning contract", async () => {
  const result = await client(valid, (url, options) => {
    assert.equal(url, "https://example.com/v1/intelligence/reason");
    assert.equal(options.headers.Authorization, "Bearer token");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { contractVersion: "1.0.0", ...input });
  }).reason(input);
  assert.deepEqual(result, valid);
});

for (const change of [{executionAuthorized: true}, {requestId: "other"},
  {contractVersion: "2.0.0"}, {verifiedDerivation: false}, {answer: "wrong"}]) {
  test("rejects invalid response " + JSON.stringify(change), async () => {
    await assert.rejects(client({...valid, ...change}).reason(input), {code: "invalid_response"});
  });
}
test("accepts abstention", async () => {
  const result = await client({...valid, status: "abstained", answer: null,
    verifiedDerivation: false}).reason(input);
  assert.equal(result.status, "abstained");
});
