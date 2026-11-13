import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withExclusiveFileLock, FileLockBusyError } from "../../integration/exclusive-file-lock.js";

async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-lock-"));
  try { await fn(join(dir, "journal.json")); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
describe("Hyper XSUS Core — exclusive file lock", () => {
  it("executes and releases lock after success", async () => {
    await fixture(async (path) => {
      expect(await withExclusiveFileLock(path, async () => 42)).toBe(42);
      await expect(access(path + ".lock")).rejects.toMatchObject({ code: "ENOENT" });
    });
  });
  it("rejects a second writer while first holds the lock", async () => {
    await fixture(async (path) => {
      let release;
      const barrier = new Promise((resolve) => { release = resolve; });
      let ready;
      const entered = new Promise((resolve) => { ready = resolve; });
      const first = withExclusiveFileLock(path, async () => {
        ready();
        await barrier;
      });
      await entered;
      try {
        await expect(withExclusiveFileLock(path, async () => "unexpected"))
          .rejects.toBeInstanceOf(FileLockBusyError);
      } finally { release(); await first; }
    });
  });
  it("releases lock when the protected operation throws", async () => {
    await fixture(async (path) => {
      await expect(withExclusiveFileLock(path, async () => {
        throw new Error("injected failure");
      })).rejects.toThrow("injected failure");
      expect(await withExclusiveFileLock(path, async () => "retry")).toBe("retry");
    });
  });
  it("fails closed on a pre-existing lock instead of stealing it", async () => {
    await fixture(async (path) => {
      await writeFile(path + ".lock", '{"pid":99999,"token":"stale"}');
      await expect(withExclusiveFileLock(path, async () => {}))
        .rejects.toMatchObject({ code: "XSUS_FILE_LOCK_BUSY" });
      expect(JSON.parse(await readFile(path + ".lock", "utf8")).token).toBe("stale");
    });
  });
  it("does not remove a lock manually replaced while holding ownership", async () => {
    await fixture(async (path) => {
      await withExclusiveFileLock(path, async () => {
        await writeFile(path + ".lock", '{"pid":99999,"token":"replacement"}');
      });
      expect(JSON.parse(await readFile(path + ".lock", "utf8")).token).toBe("replacement");
    });
  });
});
