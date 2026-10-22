
/**
 * XSUS AI Core — Persistent Memory Backup Storage
 * Version: 1.1.0
 *
 * Përgjegjësitë:
 * - Ruajtja e backup-eve në skedar JSON.
 * - Leximi dhe listimi i backup-eve.
 * - Fshirja dhe verifikimi i backup-eve.
 * - Shkrimi atomik për të zvogëluar rrezikun e dëmtimit.
 * - Parandalimi i mbishkrimit pa leje.
 * - Serializimi i operacioneve mes instancave në të njëjtin proces.
 *
 * Kufizim:
 * Koordinimi është brenda një procesi Node.js.
 * Nuk ofrohet bllokim ndërprocesor.
 */

import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { verifyMemoryBackup } from "./memory-backup.js";

export const MEMORY_BACKUP_STORAGE_VERSION = "1.1.0";

export const MEMORY_BACKUP_STORAGE_ERRORS = Object.freeze({
  INVALID_ID: "MEMORY_BACKUP_STORAGE_INVALID_ID",
  INVALID_BACKUP: "MEMORY_BACKUP_STORAGE_INVALID_BACKUP",
  CONFLICT: "MEMORY_BACKUP_STORAGE_CONFLICT",
  CORRUPTED: "MEMORY_BACKUP_STORAGE_CORRUPTED",
  IO_FAILED: "MEMORY_BACKUP_STORAGE_IO_FAILED",
});

// Radha ndahet mes të gjitha instancave të këtij moduli.
const operationQueues = new Map();

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

  // Radha vazhdon edhe kur një operacion dështon.
  const queueTail = result.catch(() => {});

  operationQueues.set(filePath, queueTail);

  // Hiq hyrjen vetëm nëse kjo është ende radha e fundit.
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

export function createMemoryBackupStorage({
  filePath = "data/xsus-memory-backups.json",
} = {}) {
  if (
    typeof filePath !== "string" ||
    filePath.trim() === ""
  ) {
    throw new TypeError(
      "filePath duhet të jetë një tekst jo bosh."
    );
  }

  // Rrugë absolute dhe e normalizuar për të gjitha instancat.
  const resolvedPath = resolve(filePath);

  function serialize(operation) {
    return serializeForPath(resolvedPath, operation);
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
    const directory = dirname(resolvedPath);
    const temporaryPath =
      `${resolvedPath}.${randomUUID()}.tmp`;

    try {
      await mkdir(directory, { recursive: true });

      await writeFile(
        temporaryPath,
        JSON.stringify(data, null, 2),
        { encoding: "utf8", flag: "wx" }
      );

      await rename(temporaryPath, resolvedPath);
    } catch (cause) {
      try {
        await rm(temporaryPath, { force: true });
      } catch {
        // Ruajmë gabimin origjinal.
      }

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

        // Klono para shkrimit që vlerat e papërshtatshme
        // të mos ndryshojnë gjendjen ekzistuese.
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
      // Nuk përdorim this.get(), sepse metoda mund të shkëputet
      // nga objekti storage.
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

          return {
            valid: isValidVerification(result),
            exists: true,
            backupId: id,
            ...(
              isValidVerification(result)
                ? {}
                : { errors: validationIssues(result) }
            ),
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
