import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, symlink, utimes, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assessJournalTemporaryFiles } from "../../integration/journal-temp-assessment.js";

const uuid = "123e4567-e89b-42d3-a456-426614174000";

describe("Hyper XSUS Core — read-only temporary file assessment v2.2.0", () => {
  it("finds only exact journal UUID temp names and never deletes them", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-temp-assess-"));
    const journal = join(dir, "journal.json");
    const temp = join(dir, ".journal.json." + uuid + ".tmp");
    try {
      await writeFile(journal, '{"entries":[]}');
      await writeFile(temp, "unfinished");
      await writeFile(join(dir, ".other.json." + uuid + ".tmp"), "other");
      await writeFile(join(dir, ".journal.json.not-a-uuid.tmp"), "other");
      const result = await assessJournalTemporaryFiles(journal, { minimumAgeMs: 0 });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: ".journal.json." + uuid + ".tmp", eligibleForReview: true, safeToDeleteAutomatically: false });
      expect(await readFile(temp, "utf8")).toBe("unfinished");
      expect(await readFile(journal, "utf8")).toBe('{"entries":[]}');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it("marks recent files for non-deletion review only", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-temp-age-"));
    const journal = join(dir, "journal.json");
    try {
      const temp = join(dir, ".journal.json." + uuid + ".tmp");
      await writeFile(temp, "active");
      const now = Date.now();
      await utimes(temp, new Date(now - 1000), new Date(now - 1000));
      const result = await assessJournalTemporaryFiles(journal, { now, minimumAgeMs: 60000 });
      expect(result).toHaveLength(1);
      expect(result[0].eligibleForReview).toBe(false);
      expect(result[0].safeToDeleteAutomatically).toBe(false);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it("ignores symlink candidates", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-temp-link-"));
    const journal = join(dir, "journal.json");
    try {
      const target = join(dir, "target");
      await writeFile(target, "untouched");
      await symlink(target, join(dir, ".journal.json." + uuid + ".tmp"));
      expect(await assessJournalTemporaryFiles(journal, { minimumAgeMs: 0 })).toEqual([]);
      expect(await readFile(target, "utf8")).toBe("untouched");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it("returns an empty list when the journal directory does not exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "xsus-temp-missing-"));
    try {
      expect(await assessJournalTemporaryFiles(join(dir, "missing", "journal.json"))).toEqual([]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it("rejects invalid assessment options", async () => {
    await expect(assessJournalTemporaryFiles("journal.json", { minimumAgeMs: -1 })).rejects.toThrow(TypeError);
    await expect(assessJournalTemporaryFiles("", {})).rejects.toThrow(TypeError);
  });
});
