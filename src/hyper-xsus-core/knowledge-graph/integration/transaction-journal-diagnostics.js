/**
 * Hyper XSUS Core — read-only transaction journal diagnostics v4.1.0.
 * Snapshot health is advisory, not an atomic observation across multiple paths.
 * Never acquires/removes locks, rewrites journals, or deletes temporary files.
 */
import { readFile, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createTransactionJournalStore } from "./transaction-journal.persistence.js";
import { assessJournalTemporaryFiles } from "./journal-temp-assessment.js";

export async function diagnoseTransactionJournal(filePath, options = {}) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new TypeError("filePath must be a non-empty string.");
  }
  const { now = Date.now(), minimumAgeMs = 60000 } = options;
  const store = createTransactionJournalStore({ filePath, exclusiveLock: false });
  let status = "healthy", revision = null, entries = null, errorCode = null;
  let counts = null;
  try {
    // Read through the existing validator, without creating a lock file.
    const snapshot = await store.loadWithRevision();
    revision = snapshot.revision;
    entries = snapshot.entries.length;
    counts = Object.freeze({
      running: snapshot.entries.filter((entry) => entry.state === "running").length,
      completed: snapshot.entries.filter((entry) => entry.state === "completed").length,
      failed: snapshot.entries.filter((entry) => entry.state === "failed").length,
      interrupted: snapshot.entries.filter((entry) => entry.state === "interrupted").length,
    });
    if (revision === null) status = "missing";
  } catch (error) {
    status = "invalid";
    errorCode = error?.code ?? (error instanceof SyntaxError ? "INVALID_JSON" : "INVALID_JOURNAL");
  } finally {
    await store.close();
  }
  let lockPresent = false;
  try {
    await lstat(filePath + ".lock");
    lockPresent = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const temporaryFiles = await assessJournalTemporaryFiles(filePath, { now, minimumAgeMs });
  return Object.freeze({
    status, revision, entries, counts, errorCode,
    lockPresent, temporaryFileCount: temporaryFiles.length,
    temporaryFiles, readOnly: true, cleanupPerformed: false,
  });
}
