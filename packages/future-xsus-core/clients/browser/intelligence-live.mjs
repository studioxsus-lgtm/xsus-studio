import assert from "node:assert/strict";
import { createXsusCoreClient } from "./xsus-core-client.js";

const baseUrl = process.env.XSUS_TEST_API_URL;
const token = process.env.XSUS_API_TOKEN;
if (!baseUrl || !token) throw new Error("Missing integration configuration");
const client = createXsusCoreClient({baseUrl, getAccessToken: async () => token});
const input = {requestId: "live-test", query: "done", facts: ["start"],
  rules: [{premises: ["start"], conclusion: "done"}]};
const result = await client.reason(input);
assert.equal(result.status, "resolved");
assert.equal(result.answer, "done");
assert.equal(result.verifiedDerivation, true);
assert.equal(result.executionAuthorized, false);
const unknown = await client.reason({...input, requestId: "unknown-test", query: "unknown"});
assert.equal(unknown.status, "abstained");
const denied = createXsusCoreClient({baseUrl, getAccessToken: async () => "invalid-token"});
await assert.rejects(denied.reason(input), {status: 401});
console.log("Live HTTP reasoning, abstention and authentication checks passed");
