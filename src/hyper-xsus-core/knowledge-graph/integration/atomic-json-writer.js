/**
 * Shared atomic JSON replacement for Hyper XSUS Core.
 * Single-writer per target path; callers serialize their own writes.
 * fsync(file) -> rename -> fsync(directory) on supported POSIX filesystems.
 * No guarantee for power loss, remote filesystems, or cross-file transactions.
 */
import { open, mkdir, rename, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export async function writeAtomicJson(filePath, payload, { io = {} } = {}) {
  const fs = { open, mkdir, rename, unlink, ...io };
  const directory = dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
  const temp = join(directory, `.${basename(filePath)}.${randomUUID()}.tmp`);
  let handle;
  let renamed = false;
  try {
    handle = await fs.open(temp, "wx", 0o600);
    await handle.writeFile(JSON.stringify(payload), "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(temp, filePath);
    renamed = true;
    // A directory fsync is necessary to request persistence of the rename.
    // Unsupported platforms/filesystems should report the error, not silently
    // claim a durable commit.
    const dirHandle = await fs.open(directory, "r");
    try { await dirHandle.sync(); } finally { await dirHandle.close(); }
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    if (!renamed) await fs.unlink(temp).catch(() => {});
    throw error;
  }
}
