
/**
 * XSUS AI Core — Memory Recovery Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Zbulimi i backup-eve të disponueshme.
 * - Verifikimi i integritetit para rikuperimit.
 * - Përzgjedhja e backup-it të përshtatshëm.
 * - Rikuperimi i një backup-i specifik ose të fundit të vlefshëm.
 * - Trajtimi i gabimeve pa ndërprerë procesin e kontrollit.
 * - Raportimi i rezultateve të rikuperimit.
 *
 * Siguria:
 * - Nuk fshin backup-e.
 * - Nuk mbishkruan memorien aktive.
 * - Nuk e konsideron backup-in të rikuperuar nëse verifikimi
 *   ose leximi i tij dështon.
 * - Kthen të dhënat për rikthim nga një shtresë tjetër e sistemit.
 */

export const MEMORY_RECOVERY_ENGINE_VERSION = "1.0.0";

export const MEMORY_RECOVERY_ERRORS = Object.freeze({
  INVALID_STORAGE: "MEMORY_RECOVERY_INVALID_STORAGE",
  INVALID_OPTIONS: "MEMORY_RECOVERY_INVALID_OPTIONS",
  BACKUP_NOT_FOUND: "MEMORY_RECOVERY_BACKUP_NOT_FOUND",
  NO_VALID_BACKUP: "MEMORY_RECOVERY_NO_VALID_BACKUP",
  VERIFICATION_FAILED: "MEMORY_RECOVERY_VERIFICATION_FAILED",
  READ_FAILED: "MEMORY_RECOVERY_READ_FAILED",
});

function createRecoveryError(code, message, cause) {
  const error = new Error(
    message,
    cause ? { cause } : undefined
  );

  error.code = code;
  return error;
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidBackupId(value) {
  return isNonEmptyString(value);
}

function isValidBackupList(value) {
  return Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        isValidBackupId(item.backupId)
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

function getCreatedAtTimestamp(value) {
  if (!isNonEmptyString(value)) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp)
    ? timestamp
    : Number.NEGATIVE_INFINITY;
}

function sortBackupsNewestFirst(backups) {
  return [...backups].sort((a, b) => {
    const timestampDifference =
      getCreatedAtTimestamp(b.createdAt) -
      getCreatedAtTimestamp(a.createdAt);

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    return a.backupId.localeCompare(b.backupId);
  });
}

function createResult({
  status,
  backupId = null,
  backup = null,
  checked = 0,
  errors = [],
}) {
  return {
    version: MEMORY_RECOVERY_ENGINE_VERSION,
    status,
    recovered: status === "recovered",
    backupId,
    backup,
    checked,
    errors,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Krijon motorin e rikuperimit të memories.
 *
 * storage duhet të jetë një instancë e krijuar me
 * createMemoryBackupStorage().
 */
export function createMemoryRecoveryEngine({ storage } = {}) {
  if (
    !storage ||
    typeof storage.list !== "function" ||
    typeof storage.get !== "function" ||
    typeof storage.verify !== "function"
  ) {
    throw createRecoveryError(
      MEMORY_RECOVERY_ERRORS.INVALID_STORAGE,
      "Storage duhet të ofrojë metodat list(), get() dhe verify()."
    );
  }

  /**
   * Kontrollon backup-et dhe kthen listën e rezultateve.
   *
   * Nuk i ndryshon backup-et.
   */
  async function inspect() {
    let backups;

    try {
      backups = await storage.list();
    } catch (cause) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.READ_FAILED,
        "Nuk mund të lexohen backup-et e memories.",
        cause
      );
    }

    if (!isValidBackupList(backups)) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.READ_FAILED,
        "Storage ktheu një listë backup-esh të pavlefshme."
      );
    }

    const orderedBackups = sortBackupsNewestFirst(backups);
    const results = [];

    for (const item of orderedBackups) {
      try {
        const verification = await storage.verify(item.backupId);

        results.push({
          backupId: item.backupId,
          createdAt: item.createdAt ?? null,
          sessionId: item.sessionId ?? null,
          version: item.version ?? null,
          valid: isValidVerification(verification),
          exists: verification?.exists === true,
          errors: Array.isArray(verification?.errors)
            ? verification.errors
            : [],
        });
      } catch (error) {
        results.push({
          backupId: item.backupId,
          createdAt: item.createdAt ?? null,
          sessionId: item.sessionId ?? null,
          version: item.version ?? null,
          valid: false,
          exists: false,
          errors: [error.message],
        });
      }
    }

    return {
      version: MEMORY_RECOVERY_ENGINE_VERSION,
      total: results.length,
      valid: results.filter((item) => item.valid).length,
      invalid: results.filter((item) => !item.valid).length,
      backups: results,
      inspectedAt: new Date().toISOString(),
    };
  }

  /**
   * Rikuperon një backup specifik.
   *
   * Kjo metodë e kthen objektin e backup-it të verifikuar.
   * Aplikacioni duhet të vendosë veçmas se si ta aplikojë
   * atë në memorien aktive.
   */
  async function recoverById(backupId) {
    if (!isValidBackupId(backupId)) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.INVALID_OPTIONS,
        "backupId duhet të jetë tekst jo bosh."
      );
    }

    const id = backupId.trim();

    let verification;

    try {
      verification = await storage.verify(id);
    } catch (cause) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.VERIFICATION_FAILED,
        `Nuk mund të verifikohet backup-i "${id}".`,
        cause
      );
    }

    if (verification?.exists !== true) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.BACKUP_NOT_FOUND,
        `Backup-i "${id}" nuk ekziston.`
      );
    }

    if (!isValidVerification(verification)) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.VERIFICATION_FAILED,
        `Backup-i "${id}" nuk kaloi verifikimin.`
      );
    }

    let backup;

    try {
      backup = await storage.get(id);
    } catch (cause) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.READ_FAILED,
        `Nuk mund të lexohet backup-i "${id}".`,
        cause
      );
    }

    if (backup === null || backup === undefined) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.BACKUP_NOT_FOUND,
        `Backup-i "${id}" nuk është më i disponueshëm.`
      );
    }

    // Kontroll i dytë përpara se të dorëzojmë të dhënat.
    // Kjo ndihmon të zbulohet një ndryshim mes verify() dhe get().
    let finalVerification;

    try {
      finalVerification = await storage.verify(id);
    } catch (cause) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.VERIFICATION_FAILED,
        `Verifikimi përfundimtar i backup-it "${id}" dështoi.`,
        cause
      );
    }

    if (!isValidVerification(finalVerification)) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.VERIFICATION_FAILED,
        `Backup-i "${id}" nuk kaloi verifikimin përfundimtar.`
      );
    }

    return createResult({
      status: "recovered",
      backupId: id,
      backup,
      checked: 1,
    });
  }

  /**
   * Përzgjedh backup-in më të ri të vlefshëm dhe e lexon.
   *
   * Nëse një backup dështon gjatë leximit ose verifikimit,
   * vazhdon me backup-in pasues.
   */
  async function recoverLatest() {
    let backups;

    try {
      backups = await storage.list();
    } catch (cause) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.READ_FAILED,
        "Nuk mund të lexohen backup-et për rikuperim.",
        cause
      );
    }

    if (!isValidBackupList(backups)) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.READ_FAILED,
        "Storage ktheu një listë backup-esh të pavlefshme."
      );
    }

    const orderedBackups = sortBackupsNewestFirst(backups);
    const errors = [];
    let checked = 0;

    for (const item of orderedBackups) {
      checked += 1;

      try {
        const verification = await storage.verify(item.backupId);

        if (
          verification?.exists !== true ||
          !isValidVerification(verification)
        ) {
          errors.push({
            backupId: item.backupId,
            message: "Backup-i nuk kaloi verifikimin.",
          });

          continue;
        }

        const backup = await storage.get(item.backupId);

        if (backup === null || backup === undefined) {
          errors.push({
            backupId: item.backupId,
            message: "Backup-i nuk është më i disponueshëm.",
          });

          continue;
        }

        const finalVerification =
          await storage.verify(item.backupId);

        if (
          finalVerification?.exists !== true ||
          !isValidVerification(finalVerification)
        ) {
          errors.push({
            backupId: item.backupId,
            message: "Verifikimi përfundimtar dështoi.",
          });

          continue;
        }

        return createResult({
          status: "recovered",
          backupId: item.backupId,
          backup,
          checked,
          errors,
        });
      } catch (error) {
        errors.push({
          backupId: item.backupId,
          message: error.message,
        });
      }
    }

    return createResult({
      status: "no_valid_backup",
      checked,
      errors: [
        ...errors,
        ...(orderedBackups.length === 0
          ? [{ message: "Nuk ka backup-e të disponueshme." }]
          : []),
      ],
    });
  }

  /**
   * Hyrja kryesore.
   *
   * recover({ backupId: "..." }) rikuperon ID-në e kërkuar.
   * recover() zgjedh backup-in më të ri të vlefshëm.
   */
  async function recover(options = {}) {
    if (
      options === null ||
      typeof options !== "object" ||
      Array.isArray(options)
    ) {
      throw createRecoveryError(
        MEMORY_RECOVERY_ERRORS.INVALID_OPTIONS,
        "Opsionet e rikuperimit duhet të jenë objekt."
      );
    }

    if (options.backupId !== undefined) {
      return recoverById(options.backupId);
    }

    return recoverLatest();
  }

  return Object.freeze({
    version: MEMORY_RECOVERY_ENGINE_VERSION,
    inspect,
    recover,
    recoverById,
    recoverLatest,
  });
}
