
/**
 * XSUS AI Core — Memory Backup Recovery
 * Version: 1.0.1
 *
 * Përgjegjësitë:
 * - Gjetja e backup-it në ruajtjen persistente.
 * - Verifikimi i integritetit para rikthimit.
 * - Parandalimi i mbishkrimit të sesioneve ekzistuese.
 * - Rikthimi përmes një funksioni të injektuar.
 * - Standardizimi i gabimeve.
 */

import { restoreMemoryBackup } from "./memory-backup.js";

export const MEMORY_BACKUP_RECOVERY_VERSION = "1.0.1";

export const MEMORY_BACKUP_RECOVERY_ERRORS = Object.freeze({
  INVALID_STORAGE: "MEMORY_BACKUP_RECOVERY_INVALID_STORAGE",
  INVALID_ID: "MEMORY_BACKUP_RECOVERY_INVALID_ID",
  NOT_FOUND: "MEMORY_BACKUP_RECOVERY_NOT_FOUND",
  INVALID_BACKUP: "MEMORY_BACKUP_RECOVERY_INVALID_BACKUP",
  SESSION_CONFLICT: "MEMORY_BACKUP_RECOVERY_SESSION_CONFLICT",
  RESTORE_FAILED: "MEMORY_BACKUP_RECOVERY_RESTORE_FAILED",
  INVALID_CALLBACK: "MEMORY_BACKUP_RECOVERY_INVALID_CALLBACK",
});

const INVALID_BACKUP_CODES = new Set([
  "MEMORY_BACKUP_INVALID",
  "MEMORY_BACKUP_SNAPSHOT_INVALID",
  "MEMORY_BACKUP_CHECKSUM_MISMATCH",
  "MEMORY_BACKUP_UNSUPPORTED_VERSION",
]);

const CONFLICT_CODES = new Set([
  "MEMORY_BACKUP_SESSION_CONFLICT",
  MEMORY_BACKUP_RECOVERY_ERRORS.SESSION_CONFLICT,
]);

function createRecoveryError(code, message, cause) {
  const error = new Error(
    message,
    cause === undefined ? undefined : { cause }
  );

  error.code = code;
  return error;
}

function normalizeBackupId(backupId) {
  if (
    typeof backupId !== "string" ||
    backupId.trim().length === 0
  ) {
    throw createRecoveryError(
      MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_ID,
      "ID-ja e backup-it duhet të jetë një tekst jo bosh."
    );
  }

  return backupId.trim();
}

function isValidVerification(result) {
  return (
    result === true ||
    result?.valid === true ||
    result?.isValid === true ||
    result?.ok === true
  );
}

function getErrorChain(error) {
  const chain = [];
  const visited = new Set();
  let current = error;

  while (
    current &&
    typeof current === "object" &&
    !visited.has(current)
  ) {
    visited.add(current);
    chain.push(current);
    current = current.cause;
  }

  return chain;
}

function classifyRecoveryError(error) {
  const chain = getErrorChain(error);

  if (
    chain.some((item) => CONFLICT_CODES.has(item.code))
  ) {
    return MEMORY_BACKUP_RECOVERY_ERRORS.SESSION_CONFLICT;
  }

  if (
    chain.some((item) => INVALID_BACKUP_CODES.has(item.code))
  ) {
    return MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_BACKUP;
  }

  const messages = chain
    .map((item) => String(item.message ?? "").toLowerCase())
    .join(" ");

  if (
    messages.includes("checksum") ||
    messages.includes("integrity") ||
    messages.includes("invalid backup") ||
    messages.includes("unsupported version") ||
    messages.includes("invalid snapshot")
  ) {
    return MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_BACKUP;
  }

  if (
    messages.includes("conflict") ||
    messages.includes("already exists") ||
    messages.includes("session exists")
  ) {
    return MEMORY_BACKUP_RECOVERY_ERRORS.SESSION_CONFLICT;
  }

  return MEMORY_BACKUP_RECOVERY_ERRORS.RESTORE_FAILED;
}

function recoveryErrorMessage(code, backupId) {
  switch (code) {
    case MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_BACKUP:
      return `Backup-i "${backupId}" nuk kaloi verifikimin.`;

    case MEMORY_BACKUP_RECOVERY_ERRORS.SESSION_CONFLICT:
      return `Sesioni i backup-it "${backupId}" ekziston tashmë.`;

    default:
      return `Rikthimi i backup-it "${backupId}" dështoi.`;
  }
}

export function createMemoryBackupRecovery({
  storage,
  restoreSnapshot,
  sessionExists,
} = {}) {
  if (!storage || typeof storage.get !== "function") {
    throw createRecoveryError(
      MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_STORAGE,
      "Kërkohet një storage me metodën get()."
    );
  }

  if (typeof restoreSnapshot !== "function") {
    throw createRecoveryError(
      MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_CALLBACK,
      "restoreSnapshot duhet të jetë funksion."
    );
  }

  if (
    sessionExists !== undefined &&
    typeof sessionExists !== "function"
  ) {
    throw createRecoveryError(
      MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_CALLBACK,
      "sessionExists duhet të jetë funksion kur jepet."
    );
  }

  async function inspect(backupId) {
    const id = normalizeBackupId(backupId);

    let backup;

    try {
      backup = await storage.get(id);
    } catch (cause) {
      throw createRecoveryError(
        MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_BACKUP,
        "Nuk mund të lexohet backup-i.",
        cause
      );
    }

    if (backup === null || backup === undefined) {
      return {
        version: MEMORY_BACKUP_RECOVERY_VERSION,
        backupId: id,
        exists: false,
        valid: false,
        canRestore: false,
        reason: MEMORY_BACKUP_RECOVERY_ERRORS.NOT_FOUND,
      };
    }

    if (typeof storage.verify === "function") {
      let verification;

      try {
        verification = await storage.verify(id);
      } catch (cause) {
        throw createRecoveryError(
          MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_BACKUP,
          "Verifikimi i backup-it dështoi.",
          cause
        );
      }

      if (!isValidVerification(verification)) {
        return {
          version: MEMORY_BACKUP_RECOVERY_VERSION,
          backupId: id,
          exists: true,
          valid: false,
          canRestore: false,
          reason: MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_BACKUP,
          errors: verification?.errors ?? [],
        };
      }
    }

    return {
      version: MEMORY_BACKUP_RECOVERY_VERSION,
      backupId: id,
      exists: true,
      valid: true,
      canRestore: true,
      sessionId: backup.sessionId ?? null,
      createdAt: backup.createdAt ?? null,
    };
  }

  async function recover(
    backupId,
    { allowOverwrite = false } = {}
  ) {
    const id = normalizeBackupId(backupId);
    const inspection = await inspect(id);

    if (!inspection.exists) {
      throw createRecoveryError(
        MEMORY_BACKUP_RECOVERY_ERRORS.NOT_FOUND,
        `Backup-i "${id}" nuk u gjet.`
      );
    }

    if (!inspection.valid) {
      throw createRecoveryError(
        MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_BACKUP,
        `Backup-i "${id}" nuk kaloi verifikimin.`
      );
    }

    let backup;

    try {
      backup = await storage.get(id);
    } catch (cause) {
      throw createRecoveryError(
        MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_BACKUP,
        "Nuk mund të lexohet backup-i për rikthim.",
        cause
      );
    }

    try {
      const result = await restoreMemoryBackup(backup, {
        restoreSnapshot: async (snapshot, metadata) => {
          return restoreSnapshot(snapshot, {
            ...metadata,
            backupId: id,
          });
        },

        sessionExists,

        allowOverwrite: allowOverwrite === true,
      });

      return {
        version: MEMORY_BACKUP_RECOVERY_VERSION,
        backupId: id,
        success: true,
        sessionId: backup.sessionId ?? null,
        result,
      };
    } catch (cause) {
      const code = classifyRecoveryError(cause);

      throw createRecoveryError(
        code,
        recoveryErrorMessage(code, id),
        cause
      );
    }
  }

  return Object.freeze({
    version: MEMORY_BACKUP_RECOVERY_VERSION,
    inspect,
    recover,
  });
}
