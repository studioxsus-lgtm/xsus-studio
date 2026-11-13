import { describe, it, expect } from "vitest";
import { mkdtemp, rm, rename, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-lock-race-"));
  const path = join(dir, "journal.json");
  try { await run(path, dir); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

describe("Hyper XSUS Core — lock pathname replacement regression", () => {
  it("does not unlink a replacement inode with a copied ownership token", async () => {
    await fixture(async (path, dir) => {
      const lock = path + ".lock";
      const result = await withExclusiveFileLock(path, async () => {
        const original = JSON.parse(await readFile(lock, "utf8"));
        await rename(lock, join(dir, "old-lock"));
        await writeFile(lock, JSON.stringify(original));
        return 42;
      });
      expect(result).toBe(42);
      expect(JSON.parse(await readFile(lock, "utf8")).token).toBeTruthy();
    });
  });
  it("preserves a replacement lock owned by a different token", async () => {
    await fixture(async (path, dir) => {
      const lock = path + ".lock";
      await withExclusiveFileLock(path, async () => {
        await rename(lock, join(dir, "old-lock"));
        await writeFile(lock, JSON.stringify({ pid: process.pid, token: "new-owner" }));
      });
      expect(JSON.parse(await readFile(lock, "utf8")).token).toBe("new-owner");
    });
  });
  it("removes the original lock after a normal successful operation", async () => {
    await fixture(async (path) => {
      expect(await withExclusiveFileLock(path, async () => "ok")).toBe("ok");
      await expect(readFile(path + ".lock")).rejects.toMatchObject({ code: "ENOENT" });
    });
  });
  it("preserves the original operation error after normal cleanup", async () => {
    await fixture(async (path) => {
      await expect(withExclusiveFileLock(path, async () => {
        throw new Error("operation failed");
      })).rejects.toThrow("operation failed");
    });
  });
});
