
/**
 * XSUS AI Core — Persistent Memory Backup Storage
 * Version: 1.2.0
 *
 * Përgjegjësitë:
 * - Ruajtja e backup-eve në skedar JSON.
 * - Leximi dhe listimi i backup-eve.
 * - Fshirja dhe verifikimi i backup-eve.
 * - Shkrimi atomik për të zvogëluar rrezikun e dëmtimit.
 * - Parandalimi i mbishkrimit pa leje.
 * - Serializimi brenda procesit dhe kyçja ndërmjet proceseve.
 * - Rikuperimi i kujdesshëm i kyçjeve të vjetruara.
 *
 * Shënim:
 * Ky mekanizëm koordinon proceset që respektojnë të njëjtin
 * protokoll lock. Për sisteme me shumë serverë ose filesystem
 * të shpërndarë, kërkohet një mekanizëm koordinimi i përshtatshëm.
 */

import { randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { verifyMemoryBackup } from "./memory-backup.js";

export const MEMORY_BACKUP_STORAGE_VERSION = "1.2.0";

export const MEMORY_BACKUP_STORAGE_ERRORS = Object.freeze({
  INVALID_ID: "MEMORY_BACKUP_STORAGE_INVALID_ID",
  INVALID_BACKUP: "MEMORY_BACKUP_STORAGE_INVALID_BACKUP",
  CONFLICT: "MEMORY_BACKUP_STORAGE_CONFLICT",
  CORRUPTED: "MEMORY_BACKUP_STORAGE_CORRUPTED",
  IO_FAILED: "MEMORY_BACKUP_STORAGE_IO_FAILED",
  LOCK_TIMEOUT: "MEMORY_BACKUP_STORAGE_LOCK_TIMEOUT",
});

const operationQueues = new Map();

const DEFAULT_LOCK_TIMEOUT_MS = 15_000;
const DEFAULT_LOCK_STALE_MS = 60_000;
const LOCK_RETRY_MIN_MS = 20;
const LOCK_RETRY_MAX_MS = 100;

function createStorageError(code, message, cause) {
  const error = new Error(
    message,
    cause ? { cause } : undefined
  );

  error.code = code;
  return error;
}

function serializeForPath(filePath, operation) {
  const previous =
    operationQueues.get(filePath) ?? Promise.resolve();

  const result = previous.then(operation, operation);
  const queueTail = result.catch(() => {});

  operationQueues.set(filePath, queueTail);

  queueTail.then(() => {
    if (operationQueues.get(filePath) === queueTail) {
      operationQueues.delete(filePath);
    }
  });

  return result;
}

function validateBackupId(backupId) {
  if (
    typeof backupId !== "string" ||
    backupId.trim().length === 0
  ) {
    throw createStorageError(
      MEMORY_BACKUP_STORAGE_ERRORS.INVALID_ID,
      "ID-ja e backup-it duhet të jetë një tekst jo bosh."
    );
  }

  return backupId.trim();
}

function cloneJSON(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function isValidVerification(result) {
  return (
    result === true ||
    result?.valid === true ||
    result?.isValid === true ||
    result?.ok === true
  );
}

function validationIssues(result) {
  if (Array.isArray(result?.issues)) {
    return result.issues;
  }

  if (Array.isArray(result?.errors)) {
    return result.errors;
  }

  return [];
}

function validateBackup(backup) {
  if (!isPlainObject(backup)) {
    throw createStorageError(
      MEMORY_BACKUP_STORAGE_ERRORS.INVALID_BACKUP,
      "Backup-i duhet të jetë një objekt i vlefshëm."
    );
  }

  let result;

  try {
    result = verifyMemoryBackup(backup);
  } catch (cause) {
    throw createStorageError(
      MEMORY_BACKUP_STORAGE_ERRORS.INVALID_BACKUP,
      "Verifikimi i backup-it dështoi.",
      cause
    );
  }

  if (!isValidVerification(result)) {
    const details = validationIssues(result)
      .map((issue) =>
        typeof issue === "string"
          ? issue
          : JSON.stringify(issue)
      )
      .join("; ");

    throw createStorageError(
      MEMORY_BACKUP_STORAGE_ERRORS.INVALID_BACKUP,
      `Backup-i nuk kaloi verifikimin.${
        details ? ` Detaje: ${details}` : ""
      }`
    );
  }
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

/**
 * Kyçje ndërprocesore përmes krijimit ekskluziv të një skedari.
 *
 * Çdo proces duhet të përdorë të njëjtin lockPath.
 * Token-i unik parandalon një proces nga fshirja e kyçjes
 * që i përket një procesi tjetër.
 */
async function acquireFileLock({
  lockPath,
  timeoutMs,
  staleMs,
}) {
  const startedAt = Date.now();
  const token = randomUUID();

  let retryCount = 0;

  while (true) {
    let handle;

    try {
      handle = await open(lockPath, "wx", 0o600);

      try {
        await handle.writeFile(
          JSON.stringify({
            token,
            pid: process.pid,
            createdAt: new Date().toISOString(),
          }),
          "utf8"
        );

        await handle.sync();
      } catch (error) {
        await handle.close().catch(() => {});
        handle = undefined;

        // Hiqe vetëm nëse skedari ende përmban token-in tonë.
        await removeLockIfOwned(lockPath, token);
        throw error;
      }

      return {
        async release() {
          await handle.close().catch(() => {});
          await removeLockIfOwned(lockPath, token);
        },
      };
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw createStorageError(
          MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED,
          "Nuk mund të krijohet kyçja e backup storage-it.",
          error
        );
      }
    }

    try {
      const lockInfo = await stat(lockPath);
      const lockAge = Date.now() - lockInfo.mtimeMs;

      if (lockAge > staleMs) {
        // Rename-i është operacion atomik në të njëjtin filesystem.
        // Vetëm një proces mund ta zhvendosë kyçjen origjinale.
        const stalePath =
          `${lockPath}.stale-${randomUUID()}`;

        try {
          await rename(lockPath, stalePath);

          await rm(stalePath, { force: true });
          continue;
        } catch (error) {
          if (
            error.code === "ENOENT" ||
            error.code === "EEXIST"
          ) {
            continue;
          }

          // Nëse kyçja nuk mund të rikuperohet, mos e fshi
          // verbërisht. Vazhdo pritjen ose përfundo me timeout.
        }
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }

      if (
        error.code === MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED
      ) {
        throw error;
      }
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw createStorageError(
        MEMORY_BACKUP_STORAGE_ERRORS.LOCK_TIMEOUT,
        `Pritja për kyçjen e storage-it tejkaloi ${timeoutMs} ms.`
      );
    }

    const delay = Math.min(
      LOCK_RETRY_MIN_MS * 2 ** Math.min(retryCount, 3),
      LOCK_RETRY_MAX_MS
    );

    retryCount += 1;

    await sleep(delay + Math.floor(Math.random() * 15));
  }
}

async function removeLockIfOwned(lockPath, token) {
  try {
    const content = await readFile(lockPath, "utf8");
    const lock = JSON.parse(content);

    if (lock?.token === token) {
      await rm(lockPath, { force: true });
    }
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) {
      throw createStorageError(
        MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED,
        "Nuk mund të lirohet kyçja e storage-it.",
        error
      );
    }
  }
}

export function createMemoryBackupStorage({
  filePath = "data/xsus-memory-backups.json",
  lockTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS,
  lockStaleMs = DEFAULT_LOCK_STALE_MS,
} = {}) {
  if (
    typeof filePath !== "string" ||
    filePath.trim() === ""
  ) {
    throw new TypeError(
      "filePath duhet të jetë një tekst jo bosh."
    );
  }

  if (
    !Number.isFinite(lockTimeoutMs) ||
    lockTimeoutMs <= 0
  ) {
    throw new TypeError(
      "lockTimeoutMs duhet të jetë numër pozitiv."
    );
  }

  if (
    !Number.isFinite(lockStaleMs) ||
    lockStaleMs <= 0
  ) {
    throw new TypeError(
      "lockStaleMs duhet të jetë numër pozitiv."
    );
  }

  const resolvedPath = resolve(filePath);
  const lockPath = `${resolvedPath}.lock`;

  function serialize(operation) {
    return serializeForPath(resolvedPath, async () => {
      await mkdir(dirname(resolvedPath), {
        recursive: true,
      });

      const lock = await acquireFileLock({
        lockPath,
        timeoutMs: lockTimeoutMs,
        staleMs: lockStaleMs,
      });

      try {
        return await operation();
      } finally {
        await lock.release();
      }
    });
  }

  async function readAll() {
    let raw;

    try {
      raw = await readFile(resolvedPath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        return Object.create(null);
      }

      throw createStorageError(
        MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED,
        "Nuk mund të lexohet skedari i backup-eve.",
        error
      );
    }

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      throw createStorageError(
        MEMORY_BACKUP_STORAGE_ERRORS.CORRUPTED,
        "Skedari i backup-eve përmban JSON të pavlefshëm.",
        cause
      );
    }

    if (!isPlainObject(parsed)) {
      throw createStorageError(
        MEMORY_BACKUP_STORAGE_ERRORS.CORRUPTED,
        "Struktura e skedarit të backup-eve nuk është e vlefshme."
      );
    }

    for (const [id, backup] of Object.entries(parsed)) {
      if (!id || !isPlainObject(backup)) {
        throw createStorageError(
          MEMORY_BACKUP_STORAGE_ERRORS.CORRUPTED,
          "Skedari përmban një hyrje backup-i të pavlefshme."
        );
      }
    }

    return parsed;
  }

  async function writeAll(data) {
    const temporaryPath =
      `${resolvedPath}.${randomUUID()}.tmp`;

    try {
      await writeFile(
        temporaryPath,
        JSON.stringify(data, null, 2),
        { encoding: "utf8", flag: "wx", mode: 0o600 }
      );

      await rename(temporaryPath, resolvedPath);
    } catch (cause) {
      await rm(temporaryPath, { force: true }).catch(() => {});

      throw createStorageError(
        MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED,
        "Nuk mund të ruhet skedari i backup-eve.",
        cause
      );
    }
  }

  return Object.freeze({
    version: MEMORY_BACKUP_STORAGE_VERSION,

    async save(backupId, backup, { overwrite = false } = {}) {
      return serialize(async () => {
        const id = validateBackupId(backupId);

        let backupCopy;

        try {
          backupCopy = cloneJSON(backup);
        } catch (cause) {
          throw createStorageError(
            MEMORY_BACKUP_STORAGE_ERRORS.INVALID_BACKUP,
            "Backup-i nuk mund të serializohet si JSON.",
            cause
          );
        }

        validateBackup(backupCopy);

        const data = await readAll();

        if (
          Object.prototype.hasOwnProperty.call(data, id) &&
          overwrite !== true
        ) {
          throw createStorageError(
            MEMORY_BACKUP_STORAGE_ERRORS.CONFLICT,
            `Backup-i "${id}" ekziston tashmë. Përdor overwrite: true për ta zëvendësuar.`
          );
        }

        data[id] = backupCopy;

        await writeAll(data);

        return {
          backupId: id,
          saved: true,
        };
      });
    },

    async get(backupId) {
      return serialize(async () => {
        const id = validateBackupId(backupId);
        const data = await readAll();

        if (!Object.prototype.hasOwnProperty.call(data, id)) {
          return null;
        }

        return cloneJSON(data[id]);
      });
    },

    async verify(backupId) {
      const id = validateBackupId(backupId);

      return serialize(async () => {
        const data = await readAll();

        if (!Object.prototype.hasOwnProperty.call(data, id)) {
          return {
            valid: false,
            exists: false,
            backupId: id,
          };
        }

        try {
          const result = verifyMemoryBackup(data[id]);
          const valid = isValidVerification(result);

          return {
            valid,
            exists: true,
            backupId: id,
            ...(valid
              ? {}
              : { errors: validationIssues(result) }),
          };
        } catch (error) {
          return {
            valid: false,
            exists: true,
            backupId: id,
            errors: [error.message],
          };
        }
      });
    },

    async delete(backupId) {
      return serialize(async () => {
        const id = validateBackupId(backupId);
        const data = await readAll();

        if (!Object.prototype.hasOwnProperty.call(data, id)) {
          return false;
        }

        delete data[id];

        await writeAll(data);

        return true;
      });
    },

    async list() {
      return serialize(async () => {
        const data = await readAll();

        return Object.entries(data)
          .map(([backupId, backup]) => ({
            backupId,
            createdAt: backup.createdAt ?? null,
            sessionId: backup.sessionId ?? null,
            version: backup.version ?? null,
          }))
          .sort((a, b) =>
            String(b.createdAt ?? "").localeCompare(
              String(a.createdAt ?? "")
            )
          );
      });
    },

    async getStats() {
      return serialize(async () => {
        const data = await readAll();

        return {
          version: MEMORY_BACKUP_STORAGE_VERSION,
          entries: Object.keys(data).length,
          filePath: resolvedPath,
        };
      });
    },
  });
}
