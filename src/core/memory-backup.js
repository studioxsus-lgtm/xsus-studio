
/**
 * XSUS AI Core — Memory Backup & Recovery
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Krijimi i kopjeve rezervë të memories.
 * - Verifikimi i integritetit përmes SHA-256.
 * - Kontrolli i formatit, versionit dhe strukturës së snapshot-it.
 * - Rikuperimi vetëm pas verifikimit.
 * - Parandalimi i mbishkrimit pa autorizim të qartë.
 *
 * Ky modul nuk ruan vetë skedarët në disk.
 */

import { createHash } from "node:crypto";
import { inspectMemorySnapshot } from "./memory-integrity.js";

export const MEMORY_BACKUP_VERSION = "1.0.0";

export const MEMORY_BACKUP_FORMAT = "xsus-memory-backup";

export const MEMORY_BACKUP_ERRORS = Object.freeze({
  INVALID_BACKUP: "MEMORY_BACKUP_INVALID",
  INVALID_SNAPSHOT: "MEMORY_BACKUP_SNAPSHOT_INVALID",
  CHECKSUM_MISMATCH: "MEMORY_BACKUP_CHECKSUM_MISMATCH",
  UNSUPPORTED_VERSION: "MEMORY_BACKUP_UNSUPPORTED_VERSION",
  SESSION_CONFLICT: "MEMORY_BACKUP_SESSION_CONFLICT",
  RESTORE_FAILED: "MEMORY_BACKUP_RESTORE_FAILED",
  INVALID_CALLBACK: "MEMORY_BACKUP_INVALID_CALLBACK",
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function serializeJSON(value) {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    throw new TypeError("Të dhënat nuk mund të serializohen si JSON.");
  }

  return serialized;
}

function calculateChecksum(payload) {
  return createHash("sha256")
    .update(serializeJSON(payload), "utf8")
    .digest("hex");
}

function createBackupError(code, message, cause) {
  const error = new Error(
    message,
    cause === undefined ? undefined : { cause }
  );

  error.code = code;
  return error;
}

function isMemoryEngineSnapshot(payload) {
  return (
    isPlainObject(payload) &&
    Object.prototype.hasOwnProperty.call(payload, "schemaVersion") &&
    Object.prototype.hasOwnProperty.call(payload, "session")
  );
}

/**
 * Krijon backup nga një snapshot JSON.
 */
export function createMemoryBackup(snapshot, { sessionId } = {}) {
  if (!isPlainObject(snapshot)) {
    throw createBackupError(
      MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT,
      "Snapshot duhet të jetë një objekt i thjeshtë."
    );
  }

  let payload;

  try {
    payload = JSON.parse(serializeJSON(snapshot));
  } catch (error) {
    throw createBackupError(
      MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT,
      error instanceof Error
        ? error.message
        : "Snapshot nuk mund të kopjohet.",
      error
    );
  }

  if (
    sessionId !== undefined &&
    (typeof sessionId !== "string" || sessionId.trim() === "")
  ) {
    throw createBackupError(
      MEMORY_BACKUP_ERRORS.INVALID_BACKUP,
      "sessionId duhet të jetë një varg jo bosh."
    );
  }

  const resolvedSessionId =
    sessionId ??
    (typeof payload.sessionId === "string"
      ? payload.sessionId
      : typeof payload.id === "string"
        ? payload.id
        : isPlainObject(payload.session) &&
            typeof payload.session.sessionId === "string"
          ? payload.session.sessionId
          : null);

  if (
    resolvedSessionId !== null &&
    (
      typeof resolvedSessionId !== "string" ||
      resolvedSessionId.trim() === ""
    )
  ) {
    throw createBackupError(
      MEMORY_BACKUP_ERRORS.INVALID_BACKUP,
      "Identiteti i sesionit nuk është i vlefshëm."
    );
  }

  return {
    format: MEMORY_BACKUP_FORMAT,
    version: MEMORY_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    sessionId: resolvedSessionId,
    checksum: calculateChecksum(payload),
    payload,
  };
}

/**
 * Verifikon formatin, versionin dhe checksum-in.
 */
export function verifyMemoryBackup(backup) {
  const issues = [];

  if (!isPlainObject(backup)) {
    return {
      valid: false,
      version: MEMORY_BACKUP_VERSION,
      issues: [
        {
          code: MEMORY_BACKUP_ERRORS.INVALID_BACKUP,
          message: "Backup duhet të jetë një objekt.",
        },
      ],
    };
  }

  if (backup.format !== MEMORY_BACKUP_FORMAT) {
    issues.push({
      code: MEMORY_BACKUP_ERRORS.INVALID_BACKUP,
      message: "Formati i backup-it nuk njihet.",
    });
  }

  if (backup.version !== MEMORY_BACKUP_VERSION) {
    issues.push({
      code: MEMORY_BACKUP_ERRORS.UNSUPPORTED_VERSION,
      message: "Versioni i backup-it nuk mbështetet.",
    });
  }

  if (
    typeof backup.createdAt !== "string" ||
    Number.isNaN(Date.parse(backup.createdAt))
  ) {
    issues.push({
      code: MEMORY_BACKUP_ERRORS.INVALID_BACKUP,
      message: "Data e krijimit të backup-it nuk është e vlefshme.",
    });
  }

  if (
    backup.sessionId !== null &&
    backup.sessionId !== undefined &&
    (
      typeof backup.sessionId !== "string" ||
      backup.sessionId.trim() === ""
    )
  ) {
    issues.push({
      code: MEMORY_BACKUP_ERRORS.INVALID_BACKUP,
      message: "Identiteti i sesionit në backup nuk është i vlefshëm.",
    });
  }

  if (!isPlainObject(backup.payload)) {
    issues.push({
      code: MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT,
      message: "Payload duhet të jetë një objekt i thjeshtë.",
    });
  }

  if (
    typeof backup.checksum !== "string" ||
    !/^[a-f0-9]{64}$/.test(backup.checksum)
  ) {
    issues.push({
      code: MEMORY_BACKUP_ERRORS.INVALID_BACKUP,
      message: "Checksum-i mungon ose nuk ka format SHA-256.",
    });
  }

  if (issues.length > 0) {
    return {
      valid: false,
      version: MEMORY_BACKUP_VERSION,
      issues,
    };
  }

  let expectedChecksum;

  try {
    expectedChecksum = calculateChecksum(backup.payload);
  } catch {
    return {
      valid: false,
      version: MEMORY_BACKUP_VERSION,
      issues: [
        {
          code: MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT,
          message: "Payload nuk mund të serializohet.",
        },
      ],
    };
  }

  if (expectedChecksum !== backup.checksum) {
    return {
      valid: false,
      version: MEMORY_BACKUP_VERSION,
      issues: [
        {
          code: MEMORY_BACKUP_ERRORS.CHECKSUM_MISMATCH,
          message: "Checksum-i nuk përputhet me përmbajtjen e backup-it.",
        },
      ],
    };
  }

  return {
    valid: true,
    version: MEMORY_BACKUP_VERSION,
    issues: [],
  };
}

/**
 * Rikthen backup vetëm pasi kalojnë:
 * 1. Kontrolli i formatit dhe checksum-it.
 * 2. Kontrolli i strukturës kur payload-i është snapshot i memory-engine.
 * 3. Kontrolli i konfliktit të sesionit.
 */
export async function restoreMemoryBackup(
  backup,
  {
    restoreSnapshot,
    sessionExists,
    allowOverwrite = false,
  } = {}
) {
  if (typeof restoreSnapshot !== "function") {
    throw createBackupError(
      MEMORY_BACKUP_ERRORS.INVALID_CALLBACK,
      "Duhet të jepet restoreSnapshot si funksion."
    );
  }

  if (
    sessionExists !== undefined &&
    typeof sessionExists !== "function"
  ) {
    throw createBackupError(
      MEMORY_BACKUP_ERRORS.INVALID_CALLBACK,
      "sessionExists duhet të jetë funksion."
    );
  }

  if (typeof allowOverwrite !== "boolean") {
    throw createBackupError(
      MEMORY_BACKUP_ERRORS.INVALID_CALLBACK,
      "allowOverwrite duhet të jetë boolean."
    );
  }

  // Faza 1: Verifiko formatin dhe checksum-in.
  const verification = verifyMemoryBackup(backup);

  if (!verification.valid) {
    const firstIssue = verification.issues[0];

    throw createBackupError(firstIssue.code, firstIssue.message);
  }

  // Faza 2: Kontrollo strukturën vetëm për snapshot-et
  // që identifikohen si të eksportuara nga memory-engine.
  if (isMemoryEngineSnapshot(backup.payload)) {
    const integrity = inspectMemorySnapshot(backup.payload);

    if (!integrity.valid) {
      const firstIssue = integrity.issues[0];

      throw createBackupError(
        MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT,
        `Snapshot-i nuk kaloi kontrollin e integritetit: ${firstIssue.code} — ${firstIssue.message}`
      );
    }

    if (
      backup.sessionId !== null &&
      backup.sessionId !== undefined &&
      backup.sessionId !== backup.payload.session.sessionId
    ) {
      throw createBackupError(
        MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT,
        "ID e sesionit në backup nuk përputhet me ID e snapshot-it."
      );
    }
  }

  // Faza 3: Kontrollo konfliktin përpara callback-ut të rikthimit.
  if (sessionExists && backup.sessionId) {
    let exists;

    try {
      exists = await sessionExists(backup.sessionId);
    } catch (error) {
      throw createBackupError(
        MEMORY_BACKUP_ERRORS.RESTORE_FAILED,
        error instanceof Error
          ? error.message
          : "Nuk mund të verifikohet gjendja e sesionit.",
        error
      );
    }

    if (exists && !allowOverwrite) {
      throw createBackupError(
        MEMORY_BACKUP_ERRORS.SESSION_CONFLICT,
        "Sesioni ekziston. Rikuperimi u ndal për të shmangur mbishkrimin."
      );
    }
  }

  // Faza 4: Kalo një kopje të izoluar te callback-u.
  let snapshot;

  try {
    snapshot = JSON.parse(serializeJSON(backup.payload));
  } catch (error) {
    throw createBackupError(
      MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT,
      "Payload nuk mund të kopjohet për rikthim.",
      error
    );
  }

  try {
    return await restoreSnapshot(snapshot, {
      sessionId: backup.sessionId,
      backupVersion: backup.version,
    });
  } catch (error) {
    throw createBackupError(
      MEMORY_BACKUP_ERRORS.RESTORE_FAILED,
      error instanceof Error
        ? error.message
        : "Rikuperimi i memories dështoi.",
      error
    );
  }
}
