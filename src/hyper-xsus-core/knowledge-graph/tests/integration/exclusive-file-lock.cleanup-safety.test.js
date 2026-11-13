import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";

async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-cleanup-safety-"));
  try { await fn(join(dir, "journal.json")); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

describe("Hyper XSUS Core — lock cleanup error preservation", () => {
  it("preserves the original operation failure after successful cleanup", async () => {
    await fixture(async (path) => {
      const original = new Error("original failure");
      await expect(withExclusiveFileLock(path, async () => {
        throw original;
      })).rejects.toBe(original);
    });
  });

  it("reports a cleanup failure when the operation succeeds", async () => {
    await fixture(async (path) => {
      await expect(withExclusiveFileLock(path, async () => {
        await writeFile(path + ".lock", "{invalid-json");
        return 42;
      })).rejects.toBeInstanceOf(SyntaxError);
    });
  });

  it("preserves both errors when operation and cleanup fail", async () => {
    await fixture(async (path) => {
      const original = new Error("operation failed");
      let caught;
      try {
        await withExclusiveFileLock(path, async () => {
          await writeFile(path + ".lock", "{invalid-json");
          throw original;
        });
      } catch (error) { caught = error; }
      expect(caught).toBeInstanceOf(AggregateError);
      expect(caught.errors[0]).toBe(original);
      expect(caught.errors[1]).toBeInstanceOf(SyntaxError);
      expect(caught.cause).toBe(original);
    });
  });

  it("returns the operation result after normal cleanup", async () => {
    await fixture(async (path) => {
      expect(await withExclusiveFileLock(path, async () => ({ ok: true })))
        .toEqual({ ok: true });
    });
  });

  it("does not delete a replaced lock while reporting the operation error", async () => {
    await fixture(async (path) => {
      const original = new Error("failed");
      await expect(withExclusiveFileLock(path, async () => {
        await writeFile(path + ".lock", JSON.stringify({
          pid: process.pid, token: "replacement",
        }));
        throw original;
      })).rejects.toBe(original);
      expect(JSON.parse(await readFile(path + ".lock", "utf8")).token)
        .toBe("replacement");
    });
  });
});
