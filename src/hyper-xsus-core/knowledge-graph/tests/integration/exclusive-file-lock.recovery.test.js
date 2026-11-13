import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assessExclusiveLockRecovery, LOCK_RECOVERY_DECISIONS,
} from "../../integration/exclusive-file-lock.recovery.js";
import { withExclusiveFileLock } from "../../integration/exclusive-file-lock.js";

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-safe-lock-recovery-"));
  const path = join(dir, "journal.json");
  try { await run(path); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

describe("Hyper XSUS Core — fail-closed safe lock recovery", () => {
  it("reports absent lock as available without creating one", async () => {
    await fixture(async (path) => {
      const result = await assessExclusiveLockRecovery(path);
      expect(result.decision).toBe(LOCK_RECOVERY_DECISIONS.AVAILABLE);
      expect(result.automaticRemovalAllowed).toBe(false);
      await expect(access(path + ".lock")).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("blocks recovery when the recorded process is present", async () => {
    await fixture(async (path) => {
      await withExclusiveFileLock(path, async () => {
        const result = await assessExclusiveLockRecovery(path);
        expect(result.decision).toBe(LOCK_RECOVERY_DECISIONS.BLOCKED_ACTIVE);
        expect(result.automaticRemovalAllowed).toBe(false);
      });
    });
  });

  it("requires manual review for malformed lock metadata", async () => {
    await fixture(async (path) => {
      await writeFile(path + ".lock", "{bad-json");
      const before = await readFile(path + ".lock");
      const result = await assessExclusiveLockRecovery(path);
      expect(result.decision).toBe(LOCK_RECOVERY_DECISIONS.MANUAL_REVIEW);
      expect(result.requiresManualReview).toBe(true);
      expect(await readFile(path + ".lock")).toEqual(before);
    });
  });

  it("never authorizes deletion for a missing or uncertain PID", async () => {
    await fixture(async (path) => {
      await writeFile(path + ".lock", JSON.stringify({
        pid: 2147483647, token: "orphan-candidate",
      }));
      const result = await assessExclusiveLockRecovery(path);
      expect([
        LOCK_RECOVERY_DECISIONS.MANUAL_REVIEW,
        LOCK_RECOVERY_DECISIONS.BLOCKED_UNKNOWN,
      ]).toContain(result.decision);
      expect(result.automaticRemovalAllowed).toBe(false);
      await expect(access(path + ".lock")).resolves.toBeUndefined();
    });
  });

  it("rejects invalid file paths", async () => {
    await expect(assessExclusiveLockRecovery("")).rejects.toThrow(TypeError);
  });

  it("exposes immutable decisions", async () => {
    await fixture(async (path) => {
      const result = await assessExclusiveLockRecovery(path);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(LOCK_RECOVERY_DECISIONS)).toBe(true);
    });
  });
});
