/**
 * XSUS AI Core — Phase 40: health capability contract.
 * Local-only HTTP tests: no production requests or Supabase writes.
 */
import { describe, expect, test } from "vitest";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

async function availablePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function runWithFlags(flags, assertion) {
  const port = await availablePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      // The writer validates configuration at startup even if its route
      // is disabled. Use inert local-test placeholders, never real secrets.
      // No private route is enabled and no network/database call is made.
      SUPABASE_URL: flags.writes === "true" ? "https://example.invalid" : "",
      SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: flags.writes === "true" ? "test-only-not-a-secret" : "",
      XSUS_PRIVATE_CHAT_ENABLED: flags.chat,
      XSUS_PRIVATE_REPLY_WRITES_ENABLED: flags.writes
    },
    stdio: "ignore"
  });
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (child.exitCode !== null) throw new Error("Local server exited.");
      try {
        const r = await fetch(base + "/health", { signal: AbortSignal.timeout(300) });
        if (r.ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    if (!ready) throw new Error("Local server did not start.");
    await assertion(base);
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await Promise.race([
        once(child, "exit").catch(() => {}),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      if (child.exitCode === null) child.kill("SIGKILL");
    }
  }
}

describe("Private chat readiness health contract", () => {
  test("reports both private capabilities disabled when flags are off", async () => {
    await runWithFlags({ chat: "false", writes: "false" }, async base => {
      const r = await fetch(base + "/health");
      expect(r.status).toBe(200);
      const data = await r.json();
      expect(data.status).toBe("ok");
      expect(data.capabilities).toEqual({ privateChat: false, privateReplyWrites: false });
      expect(JSON.stringify(data)).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|Bearer /);
    });
  }, 15000);

  test("does not advertise reply writes when private chat route is disabled", async () => {
    await runWithFlags({ chat: "false", writes: "true" }, async base => {
      const data = await (await fetch(base + "/health")).json();
      expect(data.capabilities).toEqual({ privateChat: false, privateReplyWrites: false });
    });
  }, 15000);
});
