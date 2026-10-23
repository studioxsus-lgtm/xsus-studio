
/**
 * XSUS AI Core — Memory Lifecycle Manager
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Krijimi dhe ruajtja e kopjeve rezervë.
 * - Kontrolli i integritetit të kopjeve.
 * - Rikuperimi i kontrolluar i memories.
 * - Raportimi i gjendjes së memories.
 * - Ruajtja e kopjeve të vjetra sipas politikës së retention.
 *
 * Siguria:
 * - Fshirja automatike është e çaktivizuar si parazgjedhje.
 * - Memoria aktive ndryshohet vetëm përmes applyRecoveredMemory.
 * - Gabimet kthehen në rezultate të strukturuara.
 */

import { randomUUID } from "node:crypto";

export const MEMORY_LIFECYCLE_MANAGER_VERSION = "1.0.0";

export const MEMORY_LIFECYCLE_ERRORS = Object.freeze({
  INVALID_CONFIGURATION: "INVALID_CONFIGURATION",
  BACKUP_CREATION_FAILED: "BACKUP_CREATION_FAILED",
  BACKUP_SAVE_FAILED: "BACKUP_SAVE_FAILED",
  INSPECTION_FAILED: "INSPECTION_FAILED",
  RECOVERY_FAILED: "RECOVERY_FAILED",
  APPLY_FAILED: "APPLY_FAILED",
  RETENTION_FAILED: "RETENTION_FAILED"
});

function success(operation, data = {}) {
  return {
    success: true,
    version: MEMORY_LIFECYCLE_MANAGER_VERSION,
    operation,
    ...data
  };
}

function failure(operation, errorCode, message, data = {}) {
  return {
    success: false,
    version: MEMORY_LIFECYCLE_MANAGER_VERSION,
    operation,
    error: {
      code: errorCode,
      message
    },
    ...data
  };
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeBackupList(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.backups)) {
    return result.backups;
  }

  if (Array.isArray(result?.items)) {
    return result.items;
  }

  return [];
}

function getBackupId(item) {
  if (typeof item === "string") {
    return item;
  }

  return item?.backupId ?? item?.id ?? item?.metadata?.backupId ?? null;
}

function getBackupTimestamp(item) {
  const value = item?.createdAt ?? item?.metadata?.createdAt;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function validateConfiguration({
  storage,
  recoveryEngine,
  createBackup
}) {
  if (
    !storage ||
    typeof storage.save !== "function" ||
    typeof storage.list !== "function" ||
    typeof storage.get !== "function" ||
    typeof storage.verify !== "function"
  ) {
    return "storage duhet të ofrojë save, list, get dhe verify.";
  }

  if (
    !recoveryEngine ||
    typeof recoveryEngine.inspect !== "function" ||
    typeof recoveryEngine.recover !== "function"
  ) {
    return "recoveryEngine duhet të ofrojë inspect dhe recover.";
  }

  if (typeof createBackup !== "function") {
    return "createBackup duhet të jetë funksion.";
  }

  return null;
}

/**
 * Krijon një menaxher për ciklin e jetës së memories.
 *
 * @param {object} options
 * @param {object} options.storage
 * @param {object} options.recoveryEngine
 * @param {Function} options.createBackup
 * @param {Function} [options.applyRecoveredMemory]
 * @param {number} [options.maxBackups]
 * @param {boolean} [options.enableRetention=false]
 */
export function createMemoryLifecycleManager(options = {}) {
  const {
    storage,
    recoveryEngine,
    createBackup,
    applyRecoveredMemory,
    maxBackups = 20,
    enableRetention = false
  } = options;

  const configurationError = validateConfiguration({
    storage,
    recoveryEngine,
    createBackup
  });

  if (configurationError) {
    throw new TypeError(configurationError);
  }

  if (!Number.isInteger(maxBackups) || maxBackups < 1) {
    throw new TypeError("maxBackups duhet të jetë numër i plotë pozitiv.");
  }

  if (
    applyRecoveredMemory !== undefined &&
    typeof applyRecoveredMemory !== "function"
  ) {
    throw new TypeError("applyRecoveredMemory duhet të jetë funksion.");
  }

  let operationQueue = Promise.resolve();

  // Serializon operacionet e këtij instance për të shmangur
  // ndërthurjen e veprimeve të ciklit të jetës.
  function runExclusive(operation) {
    const current = operationQueue.then(operation, operation);

    operationQueue = current.then(
      () => undefined,
      () => undefined
    );

    return current;
  }

  async function listBackups() {
    const result = await storage.list();
    return normalizeBackupList(result);
  }

  async function applyRetentionPolicy() {
    if (!enableRetention) {
      return {
        enabled: false,
        deleted: [],
        retained: null
      };
    }

    const backups = await listBackups();

    const sorted = [...backups].sort(
      (a, b) => getBackupTimestamp(b) - getBackupTimestamp(a)
    );

    const toDelete = sorted.slice(maxBackups);
    const deleted = [];

    for (const item of toDelete) {
      const backupId = getBackupId(item);

      if (typeof backupId !== "string" || backupId.length === 0) {
        continue;
      }

      await storage.delete(backupId);
      deleted.push(backupId);
    }

    return {
      enabled: true,
      deleted,
      retained: sorted.length - deleted.length
    };
  }

  /**
   * Krijon një kopje rezervë të re.
   * createBackup duhet të kthejë objektin e plotë të backup-it,
   * në formatin që pranon storage.verify.
   */
  async function createAndSaveBackup(metadata = {}) {
    return runExclusive(async () => {
      let backup;

      try {
        backup = await createBackup(metadata);
      } catch (error) {
        return failure(
          "createBackup",
          MEMORY_LIFECYCLE_ERRORS.BACKUP_CREATION_FAILED,
          getErrorMessage(error)
        );
      }

      if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
        return failure(
          "createBackup",
          MEMORY_LIFECYCLE_ERRORS.BACKUP_CREATION_FAILED,
          "Funksioni createBackup nuk ktheu një objekt të vlefshëm."
        );
      }

      const backupId =
        metadata.backupId ??
        backup.backupId ??
        backup.id ??
        randomUUID();

      if (typeof backupId !== "string" || backupId.trim().length === 0) {
        return failure(
          "createBackup",
          MEMORY_LIFECYCLE_ERRORS.BACKUP_SAVE_FAILED,
          "Identifikuesi i kopjes rezervë është i pavlefshëm."
        );
      }

      try {
        const verification = await storage.verify(backup);

        if (
          verification === false ||
          verification?.valid === false ||
          verification?.success === false
        ) {
          return failure(
            "createBackup",
            MEMORY_LIFECYCLE_ERRORS.BACKUP_CREATION_FAILED,
            "Kopja rezervë nuk kaloi kontrollin e integritetit.",
            { backupId, verification }
          );
        }
      } catch (error) {
        return failure(
          "createBackup",
          MEMORY_LIFECYCLE_ERRORS.BACKUP_CREATION_FAILED,
          `Kontrolli i integritetit dështoi: ${getErrorMessage(error)}`,
          { backupId }
        );
      }

      try {
        await storage.save(backupId, backup, { overwrite: false });
      } catch (error) {
        return failure(
          "createBackup",
          MEMORY_LIFECYCLE_ERRORS.BACKUP_SAVE_FAILED,
          getErrorMessage(error),
          { backupId }
        );
      }

      let retention;

      try {
        retention = await applyRetentionPolicy();
      } catch (error) {
        return failure(
          "createBackup",
          MEMORY_LIFECYCLE_ERRORS.RETENTION_FAILED,
          getErrorMessage(error),
          {
            backupId,
            saved: true
          }
        );
      }

      return success("createBackup", {
        backupId,
        backup,
        retention
      });
    });
  }

  /**
   * Kontrollon kopjet përmes Recovery Engine.
   */
  async function inspect() {
    return runExclusive(async () => {
      try {
        const report = await recoveryEngine.inspect();

        return success("inspect", {
          report
        });
      } catch (error) {
        return failure(
          "inspect",
          MEMORY_LIFECYCLE_ERRORS.INSPECTION_FAILED,
          getErrorMessage(error)
        );
      }
    });
  }

  /**
   * Rikuperon një kopje pa ndryshuar memorien aktive.
   */
  async function recover(backupId) {
    return runExclusive(async () => {
      if (typeof backupId !== "string" || backupId.trim().length === 0) {
        return failure(
          "recover",
          MEMORY_LIFECYCLE_ERRORS.RECOVERY_FAILED,
          "backupId duhet të jetë një varg jo bosh."
        );
      }

      try {
        const result = await recoveryEngine.recover({
          backupId
        });

        if (
          !result ||
          result.success === false ||
          result.status === "error" ||
          result.status === "not_found" ||
          result.status === "no_valid_backup"
        ) {
          return failure(
            "recover",
            MEMORY_LIFECYCLE_ERRORS.RECOVERY_FAILED,
            result?.error?.message ??
              result?.message ??
              "Rikuperimi nuk përfundoi me sukses.",
            { result }
          );
        }

        return success("recover", {
          backupId,
          result,
          applied: false
        });
      } catch (error) {
        return failure(
          "recover",
          MEMORY_LIFECYCLE_ERRORS.RECOVERY_FAILED,
          getErrorMessage(error),
          { backupId }
        );
      }
    });
  }

  /**
   * Rikuperon dhe aplikon një kopje vetëm nëse përdoruesi
   * e ka konfiguruar shprehimisht applyRecoveredMemory.
   */
  async function recoverAndApply(backupId) {
    return runExclusive(async () => {
      if (typeof applyRecoveredMemory !== "function") {
        return failure(
          "recoverAndApply",
          MEMORY_LIFECYCLE_ERRORS.INVALID_CONFIGURATION,
          "applyRecoveredMemory nuk është konfiguruar."
        );
      }

      if (typeof backupId !== "string" || backupId.trim().length === 0) {
        return failure(
          "recoverAndApply",
          MEMORY_LIFECYCLE_ERRORS.RECOVERY_FAILED,
          "backupId duhet të jetë një varg jo bosh."
        );
      }

      let recovery;

      try {
        recovery = await recoveryEngine.recover({ backupId });
      } catch (error) {
        return failure(
          "recoverAndApply",
          MEMORY_LIFECYCLE_ERRORS.RECOVERY_FAILED,
          getErrorMessage(error),
          { backupId }
        );
      }

      if (
        !recovery ||
        recovery.success === false ||
        recovery.status === "error" ||
        recovery.status === "not_found" ||
        recovery.status === "no_valid_backup"
      ) {
        return failure(
          "recoverAndApply",
          MEMORY_LIFECYCLE_ERRORS.RECOVERY_FAILED,
          recovery?.error?.message ??
            recovery?.message ??
            "Nuk u gjet një kopje e vlefshme për rikuperim.",
          { backupId, recovery }
        );
      }

      const backup =
        recovery.backup ??
        recovery.data?.backup ??
        recovery.result?.backup;

      if (!backup || typeof backup !== "object") {
        return failure(
          "recoverAndApply",
          MEMORY_LIFECYCLE_ERRORS.RECOVERY_FAILED,
          "Recovery Engine nuk ktheu objektin e rikuperuar.",
          { backupId, recovery }
        );
      }

      try {
        await applyRecoveredMemory(backup, {
          backupId,
          recovery
        });
      } catch (error) {
        return failure(
          "recoverAndApply",
          MEMORY_LIFECYCLE_ERRORS.APPLY_FAILED,
          getErrorMessage(error),
          { backupId, recovery }
        );
      }

      return success("recoverAndApply", {
        backupId,
        applied: true,
        recovery
      });
    });
  }

  /**
   * Jep një përmbledhje të gjendjes së memories.
   */
  async function getStatus() {
    return runExclusive(async () => {
      try {
        const [backups, inspection] = await Promise.all([
          listBackups(),
          recoveryEngine.inspect()
        ]);

        const sorted = [...backups].sort(
          (a, b) => getBackupTimestamp(b) - getBackupTimestamp(a)
        );

        return success("getStatus", {
          backupCount: backups.length,
          newestBackup: sorted[0] ?? null,
          oldestBackup: sorted[sorted.length - 1] ?? null,
          retention: {
            enabled: enableRetention,
            maxBackups
          },
          recovery: inspection
        });
      } catch (error) {
        return failure(
          "getStatus",
          MEMORY_LIFECYCLE_ERRORS.INSPECTION_FAILED,
          getErrorMessage(error)
        );
      }
    });
  }

  return Object.freeze({
    version: MEMORY_LIFECYCLE_MANAGER_VERSION,
    createAndSaveBackup,
    inspect,
    recover,
    recoverAndApply,
    getStatus
  });
}
