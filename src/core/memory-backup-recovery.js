
/**
 * XSUS AI Core — Memory Backup Recovery
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Gjetja e backup-it në ruajtjen persistente.
 * - Verifikimi i integritetit para rikthimit.
 * - Parandalimi i mbishkrimit të sesioneve ekzistuese.
 * - Rikthimi përmes një funksioni të injektuar.
 * - Rezultate të standardizuara dhe gabime të identifikueshme.
 *
 * Ky modul nuk ndryshon drejtpërdrejt memory-engine.js.
 */

import { restoreMemoryBackup } from "./memory-backup.js";

export const MEMORY_BACKUP_RECOVERY_VERSION = "1.0.0";

export const MEMORY_BACKUP_RECOVERY_ERRORS = Object.freeze({
  INVALID_STORAGE: "MEMORY_BACKUP_RECOVERY_INVALID_STORAGE",
  INVALID_ID: "MEMORY_BACKUP_RECOVERY_INVALID_ID",
  NOT_FOUND: "MEMORY_BACKUP_RECOVERY_NOT_FOUND",
  INVALID_BACKUP: "MEMORY_BACKUP_RECOVERY_INVALID_BACKUP",
  SESSION_CONFLICT: "MEMORY_BACKUP_RECOVERY_SESSION_CONFLICT",
  RESTORE_FAILED: "MEMORY_BACKUP_RECOVERY_RESTORE_FAILED",
  INVALID_CALLBACK: "MEMORY_BACKUP_RECOVERY_INVALID_CALLBACK",
});

function createRecoveryError(code, message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
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

export function createMemoryBackupRecovery({
  storage,
  restoreSnapshot,
  sessionExists,
} = {}) {
  if (
    !storage ||
    typeof storage.get !== "function"
  ) {
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

  return Object.freeze({
    version: MEMORY_BACKUP_RECOVERY_VERSION,

    async inspect(backupId) {
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
    },

    async recover(
      backupId,
      { allowOverwrite = false } = {}
    ) {
      const id = normalizeBackupId(backupId);

      const inspection = await this.inspect(id);

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
        const message = String(cause?.message ?? "");

        const isConflict =
          cause?.code === "MEMORY_BACKUP_SESSION_CONFLICT" ||
          message.toLowerCase().includes("conflict") ||
          message.toLowerCase().includes("already exists");

        throw createRecoveryError(
          isConflict
            ? MEMORY_BACKUP_RECOVERY_ERRORS.SESSION_CONFLICT
            : MEMORY_BACKUP_RECOVERY_ERRORS.RESTORE_FAILED,
          isConflict
            ? `Sesioni i backup-it "${id}" ekziston tashmë.`
            : `Rikthimi i backup-it "${id}" dështoi.`,
          cause
        );
      }
    },
  });
}
