import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";
import { assessJournalTemporaryFilesWithLock } from "../../integration/journal-temp-coordination.js";

const uuid = "123e4567-e89b-42d3-a456-426614174000";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-temp-coordination-"));
  const filePath = join(dir, "journal.json");
  const temp = join(dir, ".journal.json." + uuid + ".tmp");
  try {
    await writeFile(filePath, "committed");
    await writeFile(temp, "uncommitted");
    await run({ dir, filePath, temp });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("Hyper XSUS Core — safe cleanup coordination v2.3.0", () => {
  it("assesses candidates under a cooperative exclusive lock without deleting", async () => {
    await fixture(async ({ filePath, temp }) => {
      const result = await assessJournalTemporaryFilesWithLock(filePath, { minimumAgeMs: 0 });
      expect(result.lockAcquired).toBe(true);
      expect(result.cleanupPerformed).toBe(false);
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].safeToDeleteAutomatically).toBe(false);
      expect(await readFile(temp, "utf8")).toBe("uncommitted");
      expect(await readFile(filePath, "utf8")).toBe("committed");
    });
  });

  it("fails closed while another cooperative writer holds the lock", async () => {
    await fixture(async ({ filePath, temp }) => {
      await withExclusiveFileLock(filePath, async () => {
        await expect(assessJournalTemporaryFilesWithLock(filePath, { minimumAgeMs: 0 }))
          .rejects.toMatchObject({ code: "XSUS_FILE_LOCK_BUSY" });
      });
      expect(await readFile(temp, "utf8")).toBe("uncommitted");
    });
  });

  it("releases the lock after successful assessment", async () => {
    await fixture(async ({ filePath }) => {
      await assessJournalTemporaryFilesWithLock(filePath);
      await expect(access(filePath + ".lock")).rejects.toMatchObject({ code: "ENOENT" });
      await expect(assessJournalTemporaryFilesWithLock(filePath)).resolves.toMatchObject({
        lockAcquired: true, cleanupPerformed: false,
      });
    });
  });

  it("releases the lock when assessment input is invalid", async () => {
    await fixture(async ({ filePath }) => {
      await expect(assessJournalTemporaryFilesWithLock(filePath, { minimumAgeMs: -1 }))
        .rejects.toThrow(TypeError);
      await expect(access(filePath + ".lock")).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("never treats an old temp as automatically safe to delete", async () => {
    await fixture(async ({ filePath, temp }) => {
      const result = await assessJournalTemporaryFilesWithLock(filePath, {
        now: Date.now() + 86400000, minimumAgeMs: 1000,
      });
      expect(result.candidates[0].eligibleForReview).toBe(true);
      expect(result.candidates[0].safeToDeleteAutomatically).toBe(false);
      expect(await readFile(temp, "utf8")).toBe("uncommitted");
    });
  });
});
