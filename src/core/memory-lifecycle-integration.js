
/**
 * XSUS AI Core — Memory Lifecycle Integration
 * Version: 1.0.0
 *
 * Lidh:
 * - memory-engine
 * - memory-backup
 * - memory-backup-storage
 * - memory-recovery-engine
 * - memory-lifecycle-manager
 *
 * Rikuperimi nuk mbishkruan sesione aktive.
 */

import { randomUUID } from "node:crypto";

import {
  createMemorySession,
  hasMemorySession,
  exportMemorySession,
  restoreMemorySession,
} from "./memory-engine.js";

import {
  createMemoryBackup,
  restoreMemoryBackup,
  verifyMemoryBackup,
} from "./memory-backup.js";

import {
  createMemoryBackupStorage,
} from "./memory-backup-storage.js";

import {
  createMemoryRecoveryEngine,
} from "./memory-recovery-engine.js";

import {
  createMemoryLifecycleManager,
} from "./memory-lifecycle-manager.js";

export const MEMORY_LIFECYCLE_INTEGRATION_VERSION = "1.0.0";

export const MEMORY_LIFECYCLE_INTEGRATION_ERRORS = Object.freeze({
  INVALID_SESSION_ID: "MEMORY_LIFECYCLE_INVALID_SESSION_ID",
  SESSION_NOT_FOUND: "MEMORY_LIFECYCLE_SESSION_NOT_FOUND",
  INVALID_BACKUP: "MEMORY_LIFECYCLE_INVALID_BACKUP",
  SESSION_CONFLICT: "MEMORY_LIFECYCLE_SESSION_CONFLICT",
  INVALID_CONFIGURATION: "MEMORY_LIFECYCLE_INVALID_CONFIGURATION",
});

function createIntegrationError(code, message, cause) {
  const error = new Error(
    message,
    cause === undefined ? undefined : { cause }
  );

  error.code = code;
  return error;
}

function normalizeSessionId(sessionId) {
  if (
    typeof sessionId !== "string" ||
    sessionId.trim().length === 0
  ) {
    throw createIntegrationError(
      MEMORY_LIFECYCLE_INTEGRATION_ERRORS.INVALID_SESSION_ID,
      "ID-ja e sesionit duhet të jetë një tekst jo bosh."
    );
  }

  return sessionId.trim();
}

function resolveBackupSessionId(backup) {
  const sessionId = backup?.sessionId ??
    backup?.payload?.session?.sessionId;

  return normalizeSessionId(sessionId);
}

/**
 * Krijon një integrim të pavarur për ciklin e memories.
 *
 * Jep storage ose filePath, jo të dyja nëse dëshiron
 * të përdorësh storage të personalizuar.
 */
export function createMemoryLifecycleIntegration({
  storage,
  filePath,
  lockTimeoutMs,
  lockStaleMs,
  maxBackups = 20,
  enableRetention = false,
} = {}) {
  const resolvedStorage =
    storage ??
    createMemoryBackupStorage({
      ...(filePath ? { filePath } : {}),
      ...(lockTimeoutMs !== undefined ? { lockTimeoutMs } : {}),
      ...(lockStaleMs !== undefined ? { lockStaleMs } : {}),
    });

  if (
    !resolvedStorage ||
    typeof resolvedStorage.save !== "function" ||
    typeof resolvedStorage.get !== "function" ||
    typeof resolvedStorage.list !== "function" ||
    typeof resolvedStorage.verify !== "function"
  ) {
    throw createIntegrationError(
      MEMORY_LIFECYCLE_INTEGRATION_ERRORS.INVALID_CONFIGURATION,
      "Storage duhet të implementojë save, get, list dhe verify."
    );
  }

  const recoveryEngine = createMemoryRecoveryEngine({
    storage: resolvedStorage,
  });

  const lifecycleManager = createMemoryLifecycleManager({
    storage: resolvedStorage,
    recoveryEngine,

    createBackup: async (metadata = {}) => {
      const sessionId = normalizeSessionId(metadata.sessionId);
      const snapshot = exportMemorySession(sessionId);

      if (!snapshot) {
        throw createIntegrationError(
          MEMORY_LIFECYCLE_INTEGRATION_ERRORS.SESSION_NOT_FOUND,
          `Sesioni "${sessionId}" nuk u gjet në memory-engine.`
        );
      }

      const backup = createMemoryBackup(snapshot, {
        sessionId,
      });

      const verification = verifyMemoryBackup(backup);

      if (!verification.valid) {
        throw createIntegrationError(
          MEMORY_LIFECYCLE_INTEGRATION_ERRORS.INVALID_BACKUP,
          "Backup-i i krijuar nuk kaloi verifikimin."
        );
      }

      return backup;
    },

    applyRecoveredMemory: async (backup, context = {}) => {
      const sessionId = resolveBackupSessionId(backup);

      // Kontrollo përsëri para rikthimit.
      // Nuk lejohet mbishkrimi i një sesioni ekzistues.
      if (hasMemorySession(sessionId)) {
        throw createIntegrationError(
          MEMORY_LIFECYCLE_INTEGRATION_ERRORS.SESSION_CONFLICT,
          `Sesioni "${sessionId}" ekziston tashmë. Rikuperimi u ndal.`
        );
      }

      const verification = verifyMemoryBackup(backup);

      if (!verification.valid) {
        throw createIntegrationError(
          MEMORY_LIFECYCLE_INTEGRATION_ERRORS.INVALID_BACKUP,
          "Backup-i nuk kaloi verifikimin përpara rikthimit."
        );
      }

      return restoreMemoryBackup(backup, {
        sessionExists: async (id) => hasMemorySession(id),
        allowOverwrite: false,

        restoreSnapshot: async (snapshot) => {
          const restored = restoreMemorySession(
            sessionId,
            snapshot
          );

          if (!restored) {
            throw createIntegrationError(
              MEMORY_LIFECYCLE_INTEGRATION_ERRORS.INVALID_BACKUP,
              "Memory-engine nuk e riktheu snapshot-in."
            );
          }

          return {
            restored: true,
            sessionId,
            backupId: context.backupId ?? null,
            session: restored,
          };
        },
      });
    },

    maxBackups,
    enableRetention,
  });

  return Object.freeze({
    version: MEMORY_LIFECYCLE_INTEGRATION_VERSION,

    /**
     * Krijon sesion nëse nuk ekziston.
     */
    createSession(sessionId, metadata = {}) {
      const id = normalizeSessionId(sessionId);

      if (hasMemorySession(id)) {
        return {
          created: false,
          exists: true,
          sessionId: id,
        };
      }

      const session = createMemorySession(id, metadata);

      return {
        created: Boolean(session),
        exists: hasMemorySession(id),
        sessionId: id,
        session: session ?? null,
      };
    },

    /**
     * Krijon dhe ruan backup të një sesioni ekzistues.
     */
    async createBackup(sessionId, metadata = {}) {
      const id = normalizeSessionId(sessionId);

      if (!hasMemorySession(id)) {
        throw createIntegrationError(
          MEMORY_LIFECYCLE_INTEGRATION_ERRORS.SESSION_NOT_FOUND,
          `Sesioni "${id}" nuk ekziston.`
        );
      }

      return lifecycleManager.createAndSaveBackup({
        ...metadata,
        sessionId: id,
      });
    },

    /**
     * Kontrollon gjendjen e backup-eve.
     */
    async inspect() {
      return lifecycleManager.inspect();
    },

    /**
     * Rikthen një backup si të dhëna për kontroll,
     * pa e aplikuar në memory-engine.
     */
    async recover(backupId) {
      return lifecycleManager.recover(backupId);
    },

    /**
     * Rikthen një backup në memory-engine.
     * Dështon nëse sesioni ekziston tashmë.
     */
    async recoverAndApply(backupId) {
      return lifecycleManager.recoverAndApply(backupId);
    },

    /**
     * Gjendja e storage-it dhe e lifecycle manager-it.
     */
    async getStatus() {
      const [lifecycle, storageStats] = await Promise.all([
        lifecycleManager.getStatus(),
        typeof resolvedStorage.getStats === "function"
          ? resolvedStorage.getStats()
          : Promise.resolve(null),
      ]);

      return {
        version: MEMORY_LIFECYCLE_INTEGRATION_VERSION,
        lifecycle,
        storage: storageStats,
      };
    },

    /**
     * Liston backup-et e ruajtura.
     */
    async listBackups() {
      return resolvedStorage.list();
    },

    /**
     * Verifikon një backup sipas ID-së.
     */
    async verifyBackup(backupId) {
      return resolvedStorage.verify(backupId);
    },

    /**
     * Fshin një backup të caktuar.
     */
    async deleteBackup(backupId) {
      if (typeof resolvedStorage.delete !== "function") {
        throw createIntegrationError(
          MEMORY_LIFECYCLE_INTEGRATION_ERRORS.INVALID_CONFIGURATION,
          "Storage nuk implementon delete."
        );
      }

      return resolvedStorage.delete(backupId);
    },

    /**
     * Jep një ID të re për identifikues të jashtëm,
     * pa e ruajtur automatikisht backup-in.
     */
    createBackupId() {
      return randomUUID();
    },
  });
}
