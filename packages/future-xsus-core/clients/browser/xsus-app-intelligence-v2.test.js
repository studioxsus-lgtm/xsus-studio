import test from "node:test";
import assert from "node:assert/strict";
import { createAppIntelligenceV2 } from "./xsus-app-intelligence-v2.js";
import { XsusCoreApiError } from "./xsus-core-client.js";

const input = { requestId: "req", text: "prove a", facts: ["a"], rules: [] };
const response = { contractVersion: "2.0.0", requestId: "req", status: "resolved", operation: "reason", text: "a derived", memoryRevision: 0, limitations: [], externalTruthVerified: false, executionAuthorized: false };
function setup({ enabled = true, body = response, user = "alice", fetchImpl } = {}) {
  let identity = user;
  const supabase = { auth: { getSession: async () => ({ data: { session: { user: { id: identity }, access_token: "token" } } }) } };
  const calls = [];
  const fetcher = fetchImpl || (async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => body };
  });
  return { client: createAppIntelligenceV2({ supabase, enabled, fetchImpl: fetcher }), calls, setIdentity: x => { identity = x; } };
}
test("V2 sends bearer with no credentials and validates response", async () => {
  const { client, calls } = setup();
  assert.equal((await client.respond(input)).status, "resolved");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/v2\/intelligence\/respond$/);
  assert.equal(calls[0].options.headers.Authorization, "Bearer token");
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(calls[0].options.redirect, "error");
});
test("feature off blocks network", async () => {
  const { client, calls } = setup({ enabled: false });
  await assert.rejects(client.respond(input), e => e.code === "disabled");
  assert.equal(calls.length, 0);
});
test("invalid response fails closed", async () => {
  const { client } = setup({ body: { ...response, executionAuthorized: true } });
  await assert.rejects(client.respond(input), e => e.code === "invalid_response");
});
test("identity switch fails closed", async () => {
  const fixture = setup({ fetchImpl: async () => { fixture.setIdentity("bob"); return { ok: true, status: 200, json: async () => response }; } });
  await assert.rejects(fixture.client.respond(input), e => e.code === "identity_changed");
});
test("busy request and release", async () => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const { client } = setup({ fetchImpl: async () => { await wait; return { ok: true, status: 200, json: async () => response }; } });
  const pending = client.respond(input);
  await assert.rejects(client.respond(input), e => e.code === "busy");
  release();
  assert.equal((await pending).status, "resolved");
  assert.equal((await client.respond(input)).status, "resolved");
});
test("reject malformed inputs before network", async () => {
  const { client, calls } = setup();
  await assert.rejects(client.respond({ ...input, requestId: "INVALID" }), TypeError);
  assert.equal(calls.length, 0);
});
