import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyExclusiveLockOwnership } from "../../integration/exclusive-file-lock.ownership.js";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-ownership-"));
  const path = join(dir, "journal.json");
  try { await run(path, dir); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
const metadata = (token) => JSON.stringify({ pid: process.pid, token });

describe("Hyper XSUS Core — lock ownership snapshot verification", () => {
  it("reports absent lock without modifying filesystem", async () => {
    await fixture(async (path) => {
      const result = await verifyExclusiveLockOwnership(path, "expected");
      expect(result).toMatchObject({ status: "absent", verified: false });
    });
  });
  it("matches an unchanged token and forbids automatic removal", async () => {
    await fixture(async (path) => {
      await writeFile(path + ".lock", metadata("owner"));
      const result = await verifyExclusiveLockOwnership(path, "owner");
      expect(result).toMatchObject({
        status: "snapshot-match", verified: true, automaticRemovalAllowed: false,
      });
    });
  });
  it("rejects another owner's token without changing the lock", async () => {
    await fixture(async (path) => {
      await writeFile(path + ".lock", metadata("other"));
      const before = await readFile(path + ".lock");
      expect(await verifyExclusiveLockOwnership(path, "owner")).toMatchObject({
        status: "token-mismatch", verified: false,
      });
      expect(await readFile(path + ".lock")).toEqual(before);
    });
  });
  it("rejects malformed ownership metadata", async () => {
    await fixture(async (path) => {
      await writeFile(path + ".lock", "{invalid");
      expect((await verifyExclusiveLockOwnership(path, "owner")).status)
        .toBe("malformed");
    });
  });
  it("does not follow a symlink lock", async () => {
    await fixture(async (path, dir) => {
      const target = join(dir, "target");
      await writeFile(target, metadata("owner"));
      await symlink(target, path + ".lock");
      const result = await verifyExclusiveLockOwnership(path, "owner");
      expect(result.verified).toBe(false);
    });
  });
  it("validates both arguments", async () => {
    await expect(verifyExclusiveLockOwnership("", "owner")).rejects.toThrow(TypeError);
    await expect(verifyExclusiveLockOwnership("journal", "")).rejects.toThrow(TypeError);
  });
});
