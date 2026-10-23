
/**
 * XSUS AI Core — Persistent Memory Backup Storage
 * Version: 1.2.0
 *
 * Përgjegjësitë:
 * - Ruajtja e backup-eve në skedar JSON.
 * - Leximi dhe listimi i backup-eve.
 * - Fshirja dhe verifikimi i backup-eve.
 * - Shkrimi atomik dhe sinkronizimi i të dhënave.
 * - Parandalimi i mbishkrimit pa leje.
 * - Serializimi brenda procesit dhe kyçja ndërprocesore.
 * - Rikuperimi i kujdesshëm i kyçjeve të vjetruara.
 *
 * Shënim:
 * Ky mekanizëm koordinon proceset që respektojnë të njëjtin
 * protokoll lock në një filesystem të përshtatshëm.
 * Për sisteme me shumë serverë ose filesystem të shpërndarë,
 * kërkohet një mekanizëm koordinimi i dedikuar.
 */

import { randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
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

const UNSUPPORTED_DIRECTORY_SYNC_CODES = new Set([
  "EINVAL",
  "ENOTSUP",
  "EISDIR",
  "EPERM",
  "EBADF",
]);

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
 * Heq kyçjen vetëm kur skedari ende përmban token-in tonë.
 */
async function removeLockIfOwned(lockPath, token) {
  let content;

  try {
    content = await readFile(lockPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }

    throw createStorageError(
      MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED,
      "Nuk mund të lexohet skedari i kyçjes.",
      error
    );
  }

  let lock;

  try {
    lock = JSON.parse(content);
  } catch {
    // Mos fshi një kyçje të dëmtuar që nuk mund të verifikohet.
    return;
  }

  if (lock?.token !== token) {
    return;
  }

  try {
    await rm(lockPath, { force: true });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw createStorageError(
        MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED,
        "Nuk mund të lirohet kyçja e storage-it.",
        error
      );
    }
  }
}

/**
 * Kyçje ndërprocesore përmes krijimit ekskluziv të skedarit.
 *
 * Kujdes:
 * Kyçjet e vjetruara trajtohen sipas moshës së skedarit.
 * Për përdorim në mjedise me procese të gjata, kjo politikë
 * kërkon timeout dhe stale interval të konfiguruar siç duhet.
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
      } catch (cause) {
        await handle.close().catch(() => {});
        handle = undefined;

        await removeLockIfOwned(lockPath, token).catch(() => {});

        throw createStorageError(
          MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED,
          "Nuk mund të inicializohet kyçja e storage-it.",
          cause
        );
      }

      const ownedHandle = handle;

      return {
        async release() {
          let closeError;

          try {
            await ownedHandle.close();
          } catch (error) {
            closeError = error;
          }

          let removeError;

          try {
            await removeLockIfOwned(lockPath, token);
          } catch (error) {
            removeError = error;
          }

          if (closeError || removeError) {
            throw createStorageError(
              MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED,
              "Nuk mund të lirohet plotësisht kyçja e storage-it.",
              removeError ?? closeError
            );
          }
        },
      };
    } catch (error) {
      if (
        error.code === MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED
      ) {
        throw error;
      }

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

          // Mos e fshi kyçjen me forcë kur rikuperimi dështon.
        }
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }

      // Gabimet e stat() nuk duhet të çojnë në fshirje të kyçjes.
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

      let operationError;

      try {
        return await operation();
      } catch (error) {
        operationError = error;
        throw error;
      } finally {
        try {
          await lock.release();
        } catch (releaseError) {
          // Mos e masko gabimin fillestar të operacionit.
          if (!operationError) {
            throw releaseError;
          }
        }
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

    let temporaryHandle;
    let renamed = false;

    try {
      temporaryHandle = await open(
        temporaryPath,
        "wx",
        0o600
      );

      await temporaryHandle.writeFile(
        JSON.stringify(data, null, 2),
        "utf8"
      );

      // Sinkronizo përmbajtjen para zëvendësimit.
      await temporaryHandle.sync();

      await temporaryHandle.close();
      temporaryHandle = undefined;

      // Skedari i përkohshëm është në të njëjtin direktorium.
      await rename(temporaryPath, resolvedPath);
      renamed = true;

      // Sinkronizo direktoriumin kur mbështetet nga platforma.
      let directoryHandle;

      try {
        directoryHandle = await open(
          dirname(resolvedPath),
          "r"
        );

        await directoryHandle.sync();
      } catch (error) {
        if (
          !UNSUPPORTED_DIRECTORY_SYNC_CODES.has(error.code)
        ) {
          throw error;
        }
      } finally {
        await directoryHandle?.close().catch(() => {});
      }
    } catch (cause) {
      throw createStorageError(
        MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED,
        renamed
          ? "Backup-i u zëvendësua, por sinkronizimi përfundimtar dështoi."
          : "Nuk mund të ruhet skedari i backup-eve.",
        cause
      );
    } finally {
      await temporaryHandle?.close().catch(() => {});

      if (!renamed) {
        await rm(temporaryPath, { force: true }).catch(() => {});
      }
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
