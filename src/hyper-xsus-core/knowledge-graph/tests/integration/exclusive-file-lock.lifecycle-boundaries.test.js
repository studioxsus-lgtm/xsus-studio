import { describe, it, expect } from "vitest";
import { mkdtemp, rm, rename, symlink, readFile, writeFile, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";

async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-lock-lifecycle-"));
  const filePath = join(dir, "journal.json");
  try { await fn(filePath, dir); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

describe("Hyper XSUS Core — lock lifecycle safety boundaries v1.3.0", () => {
  it("rejects an existing lock and preserves its bytes", async () => {
    await fixture(async (path) => {
      const lock = path + ".lock";
      const bytes = '{"pid":123,"token":"existing"}';
      await writeFile(lock, bytes);
      await expect(withExclusiveFileLock(path, async () => "never"))
        .rejects.toMatchObject({ code: "XSUS_FILE_LOCK_BUSY" });
      expect(await readFile(lock, "utf8")).toBe(bytes);
    });
  });

  it("never removes a replacement symlink pointing to a different file", async () => {
    await fixture(async (path, dir) => {
      const lock = path + ".lock";
      const target = join(dir, "replacement-target");
      await withExclusiveFileLock(path, async () => {
        await rename(lock, join(dir, "old-lock"));
        await writeFile(target, JSON.stringify({ pid: process.pid, token: "other" }));
        await symlink(target, lock);
      });
      expect((await lstat(lock)).isSymbolicLink()).toBe(true);
      expect(JSON.parse(await readFile(target, "utf8")).token).toBe("other");
    });
  });

  it("does not remove a replacement inode even with copied token", async () => {
    await fixture(async (path, dir) => {
      const lock = path + ".lock";
      await withExclusiveFileLock(path, async () => {
        const original = await readFile(lock, "utf8");
        await rename(lock, join(dir, "old-lock"));
        await writeFile(lock, original);
      });
      expect(JSON.parse(await readFile(lock, "utf8")).token).toBeTruthy();
    });
  });

  it("releases the original lock after an operation failure", async () => {
    await fixture(async (path) => {
      await expect(withExclusiveFileLock(path, async () => {
        throw new Error("injected operation failure");
      })).rejects.toThrow("injected operation failure");
      await expect(lstat(path + ".lock")).rejects.toMatchObject({ code: "ENOENT" });
      expect(await withExclusiveFileLock(path, async () => "retry")).toBe("retry");
    });
  });

  it("keeps replacement lock when the protected operation fails", async () => {
    await fixture(async (path, dir) => {
      const lock = path + ".lock";
      await expect(withExclusiveFileLock(path, async () => {
        await rename(lock, join(dir, "old-lock"));
        await writeFile(lock, JSON.stringify({ pid: process.pid, token: "new" }));
        throw new Error("operation failure");
      })).rejects.toThrow("operation failure");
      expect(JSON.parse(await readFile(lock, "utf8")).token).toBe("new");
    });
  });

  it("rejects concurrent acquisition until the original operation finishes", async () => {
    await fixture(async (path) => {
      let release;
      const barrier = new Promise((resolve) => { release = resolve; });
      let entered;
      const ready = new Promise((resolve) => { entered = resolve; });
      const first = withExclusiveFileLock(path, async () => {
        entered();
        await barrier;
      });
      await ready;
      try {
        await expect(withExclusiveFileLock(path, async () => "second"))
          .rejects.toMatchObject({ code: "XSUS_FILE_LOCK_BUSY" });
      } finally {
        release();
        await first;
      }
      expect(await withExclusiveFileLock(path, async () => "after")).toBe("after");
    });
  });
});
