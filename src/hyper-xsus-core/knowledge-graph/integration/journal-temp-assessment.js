/**
 * Hyper XSUS Core — orphan temporary file assessment v2.2.0.
 * Read-only by design: age and filename are NOT proof that a writer is dead.
 * No automatic deletion, lock stealing, or journal modification.
 */
import { readdir, lstat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export async function assessJournalTemporaryFiles(filePath, { now = Date.now(), minimumAgeMs = 60000 } = {}) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new TypeError("filePath must be a non-empty string.");
  }
  if (!Number.isFinite(now) || !Number.isFinite(minimumAgeMs) || minimumAgeMs < 0) {
    throw new TypeError("Invalid assessment time or minimum age.");
  }
  const directory = dirname(filePath);
  const prefix = "." + basename(filePath) + ".";
  let names;
  try { names = await readdir(directory); }
  catch (error) {
    if (error?.code === "ENOENT") return Object.freeze([]);
    throw error;
  }
  const results = [];
  for (const name of names.sort()) {
    if (!name.startsWith(prefix) || !name.endsWith(".tmp") || !new RegExp("^" + UUID + "$", "i").test(name.slice(prefix.length, -4))) continue;
    const path = join(directory, name);
    let info;
    try { info = await lstat(path); }
    catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    // Symlinks and non-files must never be presented as cleanup candidates.
    if (!info.isFile() || info.isSymbolicLink()) continue;
    const ageMs = Math.max(0, now - info.mtimeMs);
    results.push(Object.freeze({
      name,
      ageMs,
      eligibleForReview: ageMs >= minimumAgeMs,
      safeToDeleteAutomatically: false,
    }));
  }
  return Object.freeze(results);
}
