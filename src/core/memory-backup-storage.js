
/**
 * XSUS AI Core — Persistent Memory Backup Storage
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Ruajtja e backup-eve në skedar JSON.
 * - Leximi dhe listimi i backup-eve.
 * - Fshirja e një backup-i të caktuar.
 * - Verifikimi i integritetit të backup-it.
 * - Shkrimi atomik për të zvogëluar rrezikun e dëmtimit të skedarit.
 * - Parandalimi i mbishkrimit pa leje.
 * - Serializimi i operacioneve për të shmangur konfliktet lokale.
 */

import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";

import { verifyMemoryBackup } from "./memory-backup.js";

export const MEMORY_BACKUP_STORAGE_VERSION = "1.0.0";

export const MEMORY_BACKUP_STORAGE_ERRORS = Object.freeze({
  INVALID_ID: "MEMORY_BACKUP_STORAGE_INVALID_ID",
  INVALID_BACKUP: "MEMORY_BACKUP_STORAGE_INVALID_BACKUP",
  CONFLICT: "MEMORY_BACKUP_STORAGE_CONFLICT",
  CORRUPTED: "MEMORY_BACKUP_STORAGE_CORRUPTED",
  IO_FAILED: "MEMORY_BACKUP_STORAGE_IO_FAILED",
});

function createStorageError(code, message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  return error;
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
  return prototype === Object.prototype || prototype === null;
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

  // Përputhshmëri me rezultatet e zakonshme të verifikimit.
  const valid =
    result === true ||
    result?.valid === true ||
    result?.isValid === true ||
    result?.ok === true;

  if (!valid) {
    const details =
      Array.isArray(result?.errors) && result.errors.length > 0
        ? ` Detaje: ${result.errors.join("; ")}`
        : "";

    throw createStorageError(
      MEMORY_BACKUP_STORAGE_ERRORS.INVALID_BACKUP,
      `Backup-i nuk kaloi verifikimin.${details}`
    );
  }
}

export function createMemoryBackupStorage({
  filePath = "data/xsus-memory-backups.json",
} = {}) {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    throw new TypeError("filePath duhet të jetë një tekst jo bosh.");
  }

  const resolvedPath = filePath;
  let operationQueue = Promise.resolve();

  function serialize(operation) {
    const result = operationQueue.then(operation, operation);

    // Një gabim nuk duhet ta bllokojë radhën e operacioneve të ardhshme.
    operationQueue = result.catch(() => {});

    return result;
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
    } catch (error) {
      throw createStorageError(
        MEMORY_BACKUP_STORAGE_ERRORS.CORRUPTED,
        "Skedari i backup-eve përmban JSON të pavlefshëm.",
        error
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
    const directory = dirname(resolvedPath);
    const temporaryPath = `${resolvedPath}.${randomUUID()}.tmp`;

    try {
      await mkdir(directory, { recursive: true });

      await writeFile(
        temporaryPath,
        JSON.stringify(data, null, 2),
        { encoding: "utf8", flag: "wx" }
      );

      await rename(temporaryPath, resolvedPath);
    } catch (error) {
      try {
        await rm(temporaryPath, { force: true });
      } catch {
        // Ruajmë gabimin origjinal të shkrimit.
      }

      throw createStorageError(
        MEMORY_BACKUP_STORAGE_ERRORS.IO_FAILED,
        "Nuk mund të ruhet skedari i backup-eve.",
        error
      );
    }
  }

  return Object.freeze({
    version: MEMORY_BACKUP_STORAGE_VERSION,

    async save(backupId, backup, { overwrite = false } = {}) {
      return serialize(async () => {
        const id = validateBackupId(backupId);
        validateBackup(backup);

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

        data[id] = cloneJSON(backup);
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
      const backup = await this.get(backupId);

      if (backup === null) {
        return {
          valid: false,
          exists: false,
          backupId: validateBackupId(backupId),
        };
      }

      try {
        const result = verifyMemoryBackup(backup);

        if (
          result === true ||
          result?.valid === true ||
          result?.isValid === true ||
          result?.ok === true
        ) {
          return {
            valid: true,
            exists: true,
            backupId: validateBackupId(backupId),
          };
        }

        return {
          valid: false,
          exists: true,
          backupId: validateBackupId(backupId),
          errors: result?.errors ?? [],
        };
      } catch (error) {
        return {
          valid: false,
          exists: true,
          backupId: validateBackupId(backupId),
          errors: [error.message],
        };
      }
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
