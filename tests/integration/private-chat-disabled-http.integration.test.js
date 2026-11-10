/**
 * XSUS AI V3 — disabled private-chat HTTP boundary.
 * Runs a separate local server with both private feature flags OFF.
 * No credentials, production endpoint, or database writes.
 */
import { afterEach, describe, expect, test } from "vitest";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

let child;

async function availablePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve, reject) =>
    probe.close((error) => error ? reject(error) : resolve())
  );
  return port;
}

async function startDisabledServer(port) {
  child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      XSUS_PRIVATE_CHAT_ENABLED: "false",
      XSUS_PRIVATE_REPLY_WRITES_ENABLED: "false",
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });

  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) {
      throw new Error(`Test server exited early: ${output}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) return;
    } catch {
      // Wait for the local process to listen.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Test server did not start: ${output}`);
}

afterEach(async () => {
  if (!child) return;
  const current = child;
  child = undefined;
  if (current.exitCode === null) {
    current.kill("SIGTERM");
    await Promise.race([
      once(current, "exit").catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    if (current.exitCode === null) current.kill("SIGKILL");
  }
});

describe("Private chat disabled HTTP boundary", () => {
  test("rejects POST with 503 before auth, body parsing, or Supabase", async () => {
    const port = await availablePort();
    await startDisabledServer(port);
    const response = await fetch(`http://127.0.0.1:${port}/api/private-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Test only — do not persist" }),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Private chat is not enabled.",
    });
  }, 15000);

  test("rejects GET with 405 while private chat is disabled", async () => {
    const port = await availablePort();
    await startDisabledServer(port);
    const response = await fetch(`http://127.0.0.1:${port}/api/private-chat`);
    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Method not allowed." });
  }, 15000);
});
