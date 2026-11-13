/**
 * Hyper XSUS Core — lock diagnostics v0.9.0.
 * Read-only observations. Never removes a lock or claims that a PID is
 * the same process that originally acquired it (PID reuse is possible).
 */
import { readFile, stat } from "node:fs/promises";

export async function inspectExclusiveFileLock(filePath) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new TypeError("filePath must be a non-empty string.");
  }
  const lockPath = `${filePath}.lock`;
  let raw;
  try {
    raw = await readFile(lockPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { status: "absent", lockPath };
    }
    return { status: "unreadable", lockPath, errorCode: error?.code ?? "UNKNOWN" };
  }

  let owner;
  try {
    owner = JSON.parse(raw);
  } catch {
    return { status: "malformed", lockPath };
  }
  if (!owner || !Number.isSafeInteger(owner.pid) || owner.pid <= 0 ||
      typeof owner.token !== "string" || !owner.token.trim()) {
    return { status: "malformed", lockPath };
  }

  let ageMs = null;
  try {
    const metadata = await stat(lockPath);
    ageMs = Math.max(0, Date.now() - metadata.mtimeMs);
  } catch {
    // The lock may have changed while being inspected.
    return { status: "unknown", lockPath, pid: owner.pid };
  }

  try {
    process.kill(owner.pid, 0);
    return { status: "process-present", lockPath, pid: owner.pid, ageMs };
  } catch (error) {
    if (error?.code === "ESRCH") {
      return { status: "process-missing", lockPath, pid: owner.pid, ageMs };
    }
    return {
      status: "unknown", lockPath, pid: owner.pid, ageMs,
      errorCode: error?.code ?? "UNKNOWN",
    };
  }
}
