import test from "node:test";
import assert from "node:assert/strict";

import { createXsusCoreClient, XsusCoreApiError } from "./xsus-core-client.js";

test("browser client sends the current access token and never enables cookies", async () => {
  const requests = [];
  let tokenVersion = 0;
  const client = createXsusCoreClient({
    baseUrl: "https://core.example.test/",
    getAccessToken: async () => `access-token-${++tokenVersion}`,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return Response.json({ session_id: "session-1", revision: 0 }, { status: 201 });
    },
  });

  await client.createSession();
  await client.getSession("session/segment");
  assert.equal(requests[0].options.headers.Authorization, "Bearer access-token-1");
  assert.equal(requests[1].options.headers.Authorization, "Bearer access-token-2");
  assert.equal(requests[0].options.credentials, "omit");
  assert.equal(requests[0].options.cache, "no-store");
  assert.equal(requests[1].url, "https://core.example.test/v1/sessions/session%2Fsegment");
});

test("learning feedback requires explicit consent before any network request", async () => {
  let requestCount = 0;
  const client = createXsusCoreClient({
    baseUrl: "https://core.example.test",
    getAccessToken: () => "access-token",
    fetchImpl: async () => {
      requestCount += 1;
      return Response.json({ example_id: "abc", status: "pending" }, { status: 202 });
    },
  });

  assert.throws(() => client.submitFeedback({ consent: false }), /Explicit consent/);
  assert.equal(requestCount, 0);
  const feedback = await client.submitFeedback({
    consent: true,
    prompt: "Please explain this sentence.",
    response: "It communicates one complete idea.",
  });
  assert.equal(feedback.status, "pending");
  assert.equal(requestCount, 1);
});

test("API errors retain status and stable error code", async () => {
  const client = createXsusCoreClient({
    baseUrl: "https://core.example.test",
    getAccessToken: () => "access-token",
    fetchImpl: async () => Response.json(
      { error: { code: "session_not_found", message: "Session not found" } },
      { status: 404 },
    ),
  });

  await assert.rejects(client.getSession("missing"), (error) => {
    assert.ok(error instanceof XsusCoreApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "session_not_found");
    return true;
  });
});

test("production client rejects insecure remote API origins", () => {
  assert.throws(() => createXsusCoreClient({
    baseUrl: "http://core.example.test",
    getAccessToken: () => "token",
  }), /must use HTTPS/);
});
