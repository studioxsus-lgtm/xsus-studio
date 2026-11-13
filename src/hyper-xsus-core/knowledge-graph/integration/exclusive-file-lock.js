/**
 * Hyper XSUS Core — exclusive file lease v0.1.0
 * Opt-in, fail-closed cross-process lock for a single local filesystem.
 * A lock left by a killed process must be investigated/released externally:
 * automatic age-based stealing is deliberately NOT supported.
 */
import { open, unlink, mkdir, lstat, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export class FileLockBusyError extends Error {
  constructor() {
    super("Journal file is locked by another process.");
    this.name = "FileLockBusyError";
    this.code = "XSUS_FILE_LOCK_BUSY";
  }
}

export async function withExclusiveFileLock(filePath, operation) {
  if (typeof filePath !== "string" || !filePath.trim() ||
      typeof operation !== "function") {
    throw new TypeError("A valid filePath and operation are required.");
  }
  const lockPath = `${filePath}.lock`;
  await mkdir(dirname(lockPath), { recursive: true });
  let handle;
  const token = randomUUID();
  try {
    handle = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") throw new FileLockBusyError();
    throw error;
  }
  let acquiredIdentity;
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, token }), "utf8");
    await handle.sync();
    acquiredIdentity = await handle.stat();
    return await operation();
  } finally {
    await handle.close();
    // Only the lock holder should remove this file. Do not delete a
    // manually replaced lock; such intervention requires investigation.
    try {
      const current = await lstat(lockPath);
      // This is a best-effort pathname identity check, not an atomic unlink.
      if (acquiredIdentity && !current.isSymbolicLink() &&
          current.dev === acquiredIdentity.dev &&
          current.ino === acquiredIdentity.ino) {
        const owner = JSON.parse(await readFile(lockPath, "utf8"));
        if (owner.token === token) {
          const latest = await lstat(lockPath);
          if (!latest.isSymbolicLink() &&
              latest.dev === acquiredIdentity.dev &&
              latest.ino === acquiredIdentity.ino) {
            await unlink(lockPath);
          }
        }
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}
