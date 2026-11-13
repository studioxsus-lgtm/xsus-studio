/**
 * Hyper XSUS Core — Lock Ownership Verification v1.1.0.
 * Read-only, fail-closed snapshot verification; never authorizes unlink.
 * Matching PID/token/inode is NOT proof that a process is alive or that
 * a lock cannot change immediately after inspection.
 */
import { open } from "node:fs/promises";

export async function verifyExclusiveLockOwnership(filePath, expectedToken) {
  if (typeof filePath !== "string" || !filePath.trim() ||
      typeof expectedToken !== "string" || !expectedToken.trim()) {
    throw new TypeError("filePath and expectedToken must be non-empty strings.");
  }
  const lockPath = `${filePath}.lock`;
  let handle;
  try {
    // O_NOFOLLOW where supported prevents following the final symlink.
    const { constants } = await import("node:fs");
    handle = await open(lockPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return Object.freeze({ status: "absent", verified: false, lockPath });
    }
    return Object.freeze({
      status: "unverifiable", verified: false, lockPath,
      errorCode: error?.code ?? "UNKNOWN",
    });
  }
  try {
    const before = await handle.stat();
    if (!before.isFile()) return Object.freeze({
      status: "unverifiable", verified: false, lockPath,
    });
    const raw = await handle.readFile("utf8");
    const after = await handle.stat();
    let owner;
    try { owner = JSON.parse(raw); } catch {
      return Object.freeze({ status: "malformed", verified: false, lockPath });
    }
    if (!owner || !Number.isSafeInteger(owner.pid) || owner.pid <= 0 ||
        typeof owner.token !== "string" || !owner.token.trim()) {
      return Object.freeze({ status: "malformed", verified: false, lockPath });
    }
    let current;
    try {
      const { lstat } = await import("node:fs/promises");
      current = await lstat(lockPath);
    } catch {
      return Object.freeze({ status: "changed", verified: false, lockPath });
    }
    if (before.dev !== after.dev || before.ino !== after.ino ||
        before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
        current.dev !== before.dev || current.ino !== before.ino ||
        current.size !== after.size || current.mtimeMs !== after.mtimeMs) {
      return Object.freeze({ status: "changed", verified: false, lockPath });
    }
    if (owner.token !== expectedToken) return Object.freeze({
      status: "token-mismatch", verified: false, lockPath, pid: owner.pid,
    });
    return Object.freeze({
      status: "snapshot-match", verified: true, lockPath, pid: owner.pid,
      automaticRemovalAllowed: false,
    });
  } catch (error) {
    return Object.freeze({
      status: "unverifiable", verified: false, lockPath,
      errorCode: error?.code ?? "UNKNOWN",
    });
  } finally {
    await handle.close();
  }
}
