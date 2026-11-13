/**
 * Hyper XSUS Core — coordinated, read-only journal temp assessment v2.3.0.
 * Only cooperates with writers using the same exclusive file lock.
 * Never deletes files; a free lock does not establish orphan ownership.
 */
import { withExclusiveFileLock } from "./exclusive-file-lock.js";
import { assessJournalTemporaryFiles } from "./journal-temp-assessment.js";

export async function assessJournalTemporaryFilesWithLock(filePath, options = {}) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new TypeError("filePath must be a non-empty string.");
  }
  return withExclusiveFileLock(filePath, async () => {
    const candidates = await assessJournalTemporaryFiles(filePath, options);
    return Object.freeze({
      lockAcquired: true,
      cleanupPerformed: false,
      candidates,
    });
  });
}
