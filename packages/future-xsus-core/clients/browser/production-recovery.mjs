import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {writeFile,readFile,unlink} from "node:fs/promises";
const base = "https://future-xsus-core-api.onrender.com";
const token = process.env.XSUS_TEST_USER_A_TOKEN;
const phase = process.argv[2];
const file = process.argv[3];
if (process.env.XSUS_PRODUCTION_PROBE !== "true" || !token || !file ||
    !["prepare","verify","cleanup"].includes(phase))
  throw new Error("Explicit opt-in, test token, phase and private receipt path required");
async function call(path,method="GET",body) {
  const res = await fetch(base+path,{method,headers:{
    Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
    body:body?JSON.stringify(body):undefined,redirect:"error",signal:AbortSignal.timeout(15000)});
  return {status:res.status,data:res.status===204?null:await res.json()};
}
const digest = data => createHash("sha256").update(JSON.stringify(data)).digest("hex");
const safeId = id => typeof id==="string" && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
if (phase==="prepare") {
  // Reserve a private receipt before creating any remote state.
  await writeFile(file,"{}",{flag:"wx",mode:0o600});
  let path;
  try {
    const created=await call("/v1/sessions","POST");
    assert.equal(created.status,201);
    assert.ok(safeId(created.data.session_id));
    path="/v1/sessions/"+created.data.session_id;
    const message=await call(path+"/messages","POST",{text:"Recovery verification sample.",language:"en",expected_revision:created.data.revision});
    assert.ok([200,201].includes(message.status));
    const saved=await call(path);
    assert.equal(saved.status,200);
    assert.ok(saved.data.revision>created.data.revision);
    assert.ok(saved.data.history.length>0);
    await writeFile(file,JSON.stringify({sessionId:created.data.session_id,revision:saved.data.revision,digest:digest(saved.data)}),{mode:0o600});
    console.log("Prepared synthetic session. Verify only after an independently confirmed maintenance restart.");
  } catch(error) {
    if(path) {
      const result=await call(path,"DELETE");
      assert.ok([200,204].includes(result.status),"Cleanup failed");
    }
    await unlink(file);
    throw error;
  }
} else {
  const receipt=JSON.parse(await readFile(file,"utf8"));
  assert.ok(safeId(receipt.sessionId));
  const path="/v1/sessions/"+receipt.sessionId;
  if(phase==="verify") {
    const saved=await call(path);
    assert.equal(saved.status,200);
    assert.equal(saved.data.revision,receipt.revision);
    assert.equal(digest(saved.data),receipt.digest);
    console.log("Persistent snapshot matches. Restart provenance must be verified separately.");
  } else {
    const result=await call(path,"DELETE");
    assert.ok([200,204].includes(result.status));
    await unlink(file);
    console.log("Synthetic session removed.");
  }
}
