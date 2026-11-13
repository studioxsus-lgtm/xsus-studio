import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, rename, unlink, symlink, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureJournalTempIdentity, verifyJournalTempIdentity } from "../../integration/journal-temp-identity.js";

const name = ".journal.json.123e4567-e89b-42d3-a456-426614174000.tmp";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-identity-"));
  const journal = join(dir, "journal.json");
  const temp = join(dir, name);
  try {
    await writeFile(journal, "committed");
    await writeFile(temp, "pending");
    await run({ dir, journal, temp });
  } finally { await rm(dir, { recursive: true, force: true }); }
}

describe("Hyper XSUS Core — temp file identity verification v2.4.0", () => {
  it("captures stable device/inode and verifies an unchanged file", async () => {
    await fixture(async ({ journal, temp }) => {
      const snapshot = await captureJournalTempIdentity(journal, name);
      expect(snapshot).toMatchObject({ name, size: 7 });
      expect(snapshot.dev).toEqual(expect.any(String));
      expect(snapshot.ino).toEqual(expect.any(String));
      expect(await verifyJournalTempIdentity(journal, snapshot)).toMatchObject({
        matches: true, safeToDeleteAutomatically: false,
      });
      expect(await readFile(temp, "utf8")).toBe("pending");
    });
  });

  it("detects pathname replacement with another inode", async () => {
    await fixture(async ({ dir, journal, temp }) => {
      const snapshot = await captureJournalTempIdentity(journal, name);
      const replacement = join(dir, "replacement");
      await writeFile(replacement, "pending");
      await rename(replacement, temp);
      expect((await verifyJournalTempIdentity(journal, snapshot)).matches).toBe(false);
    });
  });

  it("detects a removed candidate without modifying the journal", async () => {
    await fixture(async ({ journal, temp }) => {
      const snapshot = await captureJournalTempIdentity(journal, name);
      await unlink(temp);
      expect(await verifyJournalTempIdentity(journal, snapshot)).toMatchObject({
        matches: false, current: null, safeToDeleteAutomatically: false,
      });
      expect(await readFile(journal, "utf8")).toBe("committed");
    });
  });

  it("rejects symlink replacement even when it points to a regular file", async () => {
    await fixture(async ({ dir, journal, temp }) => {
      const snapshot = await captureJournalTempIdentity(journal, name);
      await unlink(temp);
      await symlink(join(dir, "journal.json"), temp);
      expect((await verifyJournalTempIdentity(journal, snapshot)).matches).toBe(false);
      expect(await captureJournalTempIdentity(journal, name)).toBeNull();
    });
  });

  it("rejects unrelated filenames and incomplete snapshots", async () => {
    await fixture(async ({ journal }) => {
      await expect(captureJournalTempIdentity(journal, "../journal.json")).rejects.toThrow(TypeError);
      await expect(verifyJournalTempIdentity(journal, { name })).rejects.toThrow(TypeError);
    });
  });
});
