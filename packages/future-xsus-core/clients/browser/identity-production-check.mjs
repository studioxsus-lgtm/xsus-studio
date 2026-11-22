import assert from "node:assert/strict";
const base = "https://future-xsus-core-api.onrender.com";
const a = process.env.XSUS_TEST_USER_A_TOKEN;
const b = process.env.XSUS_TEST_USER_B_TOKEN;
if (!a || !b || a === b) throw new Error("Two distinct test-user access tokens required");
async function call(path, method, token) {
  const response = await fetch(base + path, {
    method, headers: token ? {Authorization: "Bearer " + token} : {},
    redirect: "error", signal: AbortSignal.timeout(15000)
  });
  return response;
}
let session;
try {
  assert.equal((await call("/healthz", "GET")).status, 200);
  assert.equal((await call("/v1/sessions", "GET")).status, 401);
  assert.equal((await call("/v1/sessions", "GET", "invalid-test-token")).status, 401);
  assert.equal((await call("/v1/sessions", "GET", b)).status, 200);
  const created = await call("/v1/sessions", "POST", a);
  assert.equal(created.status, 201);
  const data = await created.json();
  assert.match(data.session_id, /^[a-zA-Z0-9_-]{1,128}$/);
  session = "/v1/sessions/" + data.session_id;
  assert.equal((await call(session, "GET", a)).status, 200);
  assert.equal((await call(session, "GET", b)).status, 404);
  assert.equal((await call(session, "DELETE", b)).status, 404);
  assert.equal((await call(session, "GET", a)).status, 200);
} finally {
  if (session) {
    const deleted = await call(session, "DELETE", a);
    assert.ok([200, 204].includes(deleted.status), "Test session cleanup failed");
  }
}
console.log("Deployed identity and session isolation checks passed");
