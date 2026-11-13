/**
 * Hyper XSUS Core — temporary file identity checks v2.4.0.
 * Read-only snapshots, not an authorization to unlink files.
 * A pathname may change after verification (TOCTOU).
 */
import { lstat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function candidatePath(filePath, name) {
  if (typeof filePath !== "string" || !filePath.trim() || typeof name !== "string") {
    throw new TypeError("Valid journal path and candidate name are required.");
  }
  const prefix = "." + basename(filePath) + ".";
  if (!name.startsWith(prefix) || !name.endsWith(".tmp") ||
      !UUID.test(name.slice(prefix.length, -4))) {
    throw new TypeError("Candidate is not a journal temporary filename.");
  }
  return join(dirname(filePath), name);
}

export async function captureJournalTempIdentity(filePath, name) {
  const path = candidatePath(filePath, name);
  let info;
  try { info = await lstat(path); }
  catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  if (!info.isFile() || info.isSymbolicLink()) return null;
  return Object.freeze({
    name, dev: String(info.dev), ino: String(info.ino),
    size: info.size, mtimeMs: info.mtimeMs, ctimeMs: info.ctimeMs,
  });
}

export async function verifyJournalTempIdentity(filePath, expected) {
  if (!expected || typeof expected !== "object" ||
      typeof expected.name !== "string" ||
      typeof expected.dev !== "string" || typeof expected.ino !== "string" ||
      !Number.isFinite(expected.size) || !Number.isFinite(expected.mtimeMs) ||
      !Number.isFinite(expected.ctimeMs)) {
    throw new TypeError("A complete identity snapshot is required.");
  }
  const current = await captureJournalTempIdentity(filePath, expected.name);
  return Object.freeze({
    matches: current !== null &&
      current.dev === expected.dev && current.ino === expected.ino &&
      current.size === expected.size &&
      current.mtimeMs === expected.mtimeMs &&
      current.ctimeMs === expected.ctimeMs,
    current,
    safeToDeleteAutomatically: false,
  });
}
