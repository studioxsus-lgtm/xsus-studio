import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectExclusiveFileLock } from "../../integration/exclusive-file-lock.diagnostics.js";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";

async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-lock-diagnostics-"));
  const filePath = join(dir, "journal.json");
  try { await fn(filePath); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

describe("Hyper XSUS Core — read-only lock diagnostics", () => {
  it("reports absent lock without creating a file", async () => {
    await fixture(async (path) => {
      expect((await inspectExclusiveFileLock(path)).status).toBe("absent");
      await expect(access(path + ".lock")).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("detects the current process holding a lock", async () => {
    await fixture(async (path) => {
      await withExclusiveFileLock(path, async () => {
        const result = await inspectExclusiveFileLock(path);
        expect(result.status).toBe("process-present");
        expect(result.pid).toBe(process.pid);
        expect(result.ageMs).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it("reports malformed JSON without modifying it", async () => {
    await fixture(async (path) => {
      await writeFile(path + ".lock", '{"pid":');
      expect((await inspectExclusiveFileLock(path)).status).toBe("malformed");
      await expect(access(path + ".lock")).resolves.toBeUndefined();
    });
  });

  it("rejects invalid ownership metadata", async () => {
    await fixture(async (path) => {
      await writeFile(path + ".lock", JSON.stringify({ pid: -1, token: "" }));
      expect((await inspectExclusiveFileLock(path)).status).toBe("malformed");
    });
  });

  it("reports a missing process without removing the lock", async () => {
    await fixture(async (path) => {
      // Large PID outside normal Linux PID range, without creating a process.
      await writeFile(path + ".lock", JSON.stringify({
        pid: 2147483647, token: "test-token",
      }));
      const result = await inspectExclusiveFileLock(path);
      expect(["process-missing", "unknown"]).toContain(result.status);
      await expect(access(path + ".lock")).resolves.toBeUndefined();
    });
  });

  it("validates the file path", async () => {
    await expect(inspectExclusiveFileLock("")).rejects.toThrow(TypeError);
  });
});
