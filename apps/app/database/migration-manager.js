
/**
 * XSUS App — Migration Manager
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Regjistrimi dhe validimi i migrimeve.
 * - Menaxhimi i versioneve të skemës.
 * - Përgatitja e planeve të migrimit.
 * - Ekzekutimi përmes një provider-i të injektuar.
 * - Ruajtja e historikut në RAM.
 * - Mbështetja e rollback kur provider-i e ofron.
 * - Menaxhimi i gabimeve dhe lifecycle.
 */

export const MIGRATION_MANAGER_VERSION = "1.0.0";

export const MIGRATION_MANAGER_ERRORS = Object.freeze({
  INVALID_CONFIG: "INVALID_MIGRATION_CONFIG",
  INVALID_MIGRATION: "INVALID_MIGRATION",
  DUPLICATE_MIGRATION: "DUPLICATE_MIGRATION",
  MIGRATION_NOT_FOUND: "MIGRATION_NOT_FOUND",
  INVALID_VERSION: "INVALID_MIGRATION_VERSION",
  PROVIDER_UNAVAILABLE: "MIGRATION_PROVIDER_UNAVAILABLE",
  INVALID_PROVIDER: "INVALID_MIGRATION_PROVIDER",
  MIGRATION_FAILED: "MIGRATION_FAILED",
  ROLLBACK_UNSUPPORTED: "MIGRATION_ROLLBACK_UNSUPPORTED",
  ROLLBACK_FAILED: "MIGRATION_ROLLBACK_FAILED",
  MANAGER_CLOSED: "MIGRATION_MANAGER_CLOSED",
  OPERATION_IN_PROGRESS: "MIGRATION_OPERATION_IN_PROGRESS",
});

const DEFAULT_CONFIG = Object.freeze({
  initialVersion: 0,
  maxMigrations: 1000,
  maxHistoryEntries: 5000,
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function normalizeVersion(value, fieldName = "version") {
  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new TypeError(
      `${fieldName} must be a non-negative safe integer.`
    );
  }

  return value;
}

function cloneRecord(record) {
  return Object.freeze({
    ...record,
    metadata: Object.freeze({
      ...(record.metadata || {}),
    }),
  });
}

function createError(code, message, cause) {
  const error = new Error(message);

  error.code = code;

  if (cause !== undefined) {
    error.cause = cause;
  }

  return error;
}

export function createMigrationManager(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError(
      MIGRATION_MANAGER_ERRORS.INVALID_CONFIG
    );
  }

  const config = {
    ...DEFAULT_CONFIG,
    ...(isPlainObject(options.config) ? options.config : {}),
  };

  normalizeVersion(config.initialVersion, "initialVersion");

  if (
    !Number.isSafeInteger(config.maxMigrations) ||
    config.maxMigrations < 1 ||
    !Number.isSafeInteger(config.maxHistoryEntries) ||
    config.maxHistoryEntries < 1
  ) {
    throw new TypeError(
      MIGRATION_MANAGER_ERRORS.INVALID_CONFIG
    );
  }

  const provider = options.provider || null;

  if (
    provider !== null &&
    (
      typeof provider !== "object" ||
      typeof provider.apply !== "function"
    )
  ) {
    throw new TypeError(
      MIGRATION_MANAGER_ERRORS.INVALID_PROVIDER
    );
  }

  const migrations = new Map();
  const history = [];

  let currentVersion = config.initialVersion;
  let closed = false;
  let operationInProgress = false;

  function assertOpen() {
    if (closed) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.MANAGER_CLOSED,
        "Migration Manager is closed."
      );
    }
  }

  function assertIdle() {
    if (operationInProgress) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.OPERATION_IN_PROGRESS,
        "A migration operation is already in progress."
      );
    }
  }

  function normalizeMigration(input) {
    if (!isPlainObject(input)) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.INVALID_MIGRATION,
        "Migration must be a plain object."
      );
    }

    const {
      id,
      fromVersion,
      toVersion,
      description = "",
      metadata = {},
    } = input;

    if (
      typeof id !== "string" ||
      id.trim().length === 0
    ) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.INVALID_MIGRATION,
        "Migration id is required."
      );
    }

    const from = normalizeVersion(
      fromVersion,
      "fromVersion"
    );

    const to = normalizeVersion(
      toVersion,
      "toVersion"
    );

    if (to <= from) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.INVALID_VERSION,
        "toVersion must be greater than fromVersion."
      );
    }

    if (typeof description !== "string") {
      throw createError(
        MIGRATION_MANAGER_ERRORS.INVALID_MIGRATION,
        "Migration description must be a string."
      );
    }

    if (!isPlainObject(metadata)) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.INVALID_MIGRATION,
        "Migration metadata must be a plain object."
      );
    }

    return cloneRecord({
      id: id.trim(),
      fromVersion: from,
      toVersion: to,
      description,
      metadata,
      registeredAt: new Date().toISOString(),
    });
  }

  function addHistory(entry) {
    if (history.length >= config.maxHistoryEntries) {
      history.shift();
    }

    history.push(
      Object.freeze({
        ...entry,
        timestamp: new Date().toISOString(),
      })
    );
  }

  function register(input) {
    assertOpen();
    assertIdle();

    const migration = normalizeMigration(input);

    if (migrations.has(migration.id)) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.DUPLICATE_MIGRATION,
        `Migration "${migration.id}" already exists.`
      );
    }

    if (migrations.size >= config.maxMigrations) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.INVALID_CONFIG,
        "Maximum number of migrations reached."
      );
    }

    const overlapping = [...migrations.values()].some(
      (existing) =>
        existing.fromVersion === migration.fromVersion ||
        existing.toVersion === migration.toVersion
    );

    if (overlapping) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.INVALID_MIGRATION,
        "Migration version transition conflicts with an existing migration."
      );
    }

    migrations.set(migration.id, migration);

    return migration;
  }

  function get(id) {
    assertOpen();

    const migration = migrations.get(id);

    return migration || null;
  }

  function list() {
    assertOpen();

    return [...migrations.values()].sort(
      (a, b) =>
        a.fromVersion - b.fromVersion ||
        a.toVersion - b.toVersion
    );
  }

  function buildPlan(targetVersion) {
    const target = normalizeVersion(
      targetVersion,
      "targetVersion"
    );

    if (target < currentVersion) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.INVALID_VERSION,
        "Target version is lower than the current version. Use rollback."
      );
    }

    const ordered = [...migrations.values()].sort(
      (a, b) => a.fromVersion - b.fromVersion
    );

    let plannedVersion = currentVersion;
    const plan = [];

    while (plannedVersion < target) {
      const next = ordered.find(
        (migration) =>
          migration.fromVersion === plannedVersion &&
          migration.toVersion <= target
      );

      if (!next) {
        throw createError(
          MIGRATION_MANAGER_ERRORS.INVALID_VERSION,
          `No migration found from version ${plannedVersion} toward ${target}.`
        );
      }

      plan.push(next);
      plannedVersion = next.toVersion;
    }

    if (plannedVersion !== target) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.INVALID_VERSION,
        "Migration plan does not reach the requested target version."
      );
    }

    return Object.freeze([...plan]);
  }

  function plan(targetVersion) {
    assertOpen();

    return Object.freeze({
      fromVersion: currentVersion,
      targetVersion: normalizeVersion(
        targetVersion,
        "targetVersion"
      ),
      migrations: buildPlan(targetVersion),
    });
  }

  async function migrate(targetVersion) {
    assertOpen();
    assertIdle();

    if (!provider) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.PROVIDER_UNAVAILABLE,
        "No migration provider is configured."
      );
    }

    const migrationPlan = buildPlan(targetVersion);

    if (migrationPlan.length === 0) {
      return Object.freeze({
        success: true,
        fromVersion: currentVersion,
        currentVersion,
        executed: [],
      });
    }

    operationInProgress = true;

    const executed = [];
    const startingVersion = currentVersion;

    try {
      for (const migration of migrationPlan) {
        try {
          await provider.apply(migration);

          currentVersion = migration.toVersion;
          executed.push(migration.id);

          addHistory({
            migrationId: migration.id,
            action: "apply",
            status: "success",
            fromVersion: migration.fromVersion,
            toVersion: migration.toVersion,
          });
        } catch (cause) {
          addHistory({
            migrationId: migration.id,
            action: "apply",
            status: "failed",
            fromVersion: migration.fromVersion,
            toVersion: migration.toVersion,
            error: cause?.message || "Unknown migration error",
          });

          throw createError(
            MIGRATION_MANAGER_ERRORS.MIGRATION_FAILED,
            `Migration "${migration.id}" failed.`,
            cause
          );
        }
      }

      return Object.freeze({
        success: true,
        fromVersion: startingVersion,
        currentVersion,
        executed: Object.freeze([...executed]),
      });
    } finally {
      operationInProgress = false;
    }
  }

  async function rollback(targetVersion) {
    assertOpen();
    assertIdle();

    if (!provider || typeof provider.rollback !== "function") {
      throw createError(
        MIGRATION_MANAGER_ERRORS.ROLLBACK_UNSUPPORTED,
        "The configured provider does not support rollback."
      );
    }

    const target = normalizeVersion(
      targetVersion,
      "targetVersion"
    );

    if (target >= currentVersion) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.INVALID_VERSION,
        "Rollback target must be lower than the current version."
      );
    }

    const applied = history
      .filter((entry) => entry.action === "apply" && entry.status === "success")
      .map((entry) => entry.migrationId);

    const candidates = [...migrations.values()]
      .filter(
        (migration) =>
          applied.includes(migration.id) &&
          migration.toVersion <= currentVersion &&
          migration.fromVersion >= target
      )
      .sort((a, b) => b.fromVersion - a.fromVersion);

    let rollbackVersion = currentVersion;
    const rollbackPlan = [];

    for (const migration of candidates) {
      if (migration.toVersion !== rollbackVersion) {
        continue;
      }

      rollbackPlan.push(migration);
      rollbackVersion = migration.fromVersion;

      if (rollbackVersion === target) {
        break;
      }
    }

    if (rollbackVersion !== target) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.INVALID_VERSION,
        "A complete rollback path to the requested version was not found."
      );
    }

    operationInProgress = true;

    const rolledBack = [];
    const startingVersion = currentVersion;

    try {
      for (const migration of rollbackPlan) {
        try {
          await provider.rollback(migration);

          currentVersion = migration.fromVersion;
          rolledBack.push(migration.id);

          addHistory({
            migrationId: migration.id,
            action: "rollback",
            status: "success",
            fromVersion: migration.toVersion,
            toVersion: migration.fromVersion,
          });
        } catch (cause) {
          addHistory({
            migrationId: migration.id,
            action: "rollback",
            status: "failed",
            fromVersion: migration.toVersion,
            toVersion: migration.fromVersion,
            error: cause?.message || "Unknown rollback error",
          });

          throw createError(
            MIGRATION_MANAGER_ERRORS.ROLLBACK_FAILED,
            `Rollback for migration "${migration.id}" failed.`,
            cause
          );
        }
      }

      return Object.freeze({
        success: true,
        fromVersion: startingVersion,
        currentVersion,
        rolledBack: Object.freeze([...rolledBack]),
      });
    } finally {
      operationInProgress = false;
    }
  }

  function getHistory() {
    assertOpen();

    return [...history];
  }

  function getStatus() {
    return Object.freeze({
      version: MIGRATION_MANAGER_VERSION,
      currentVersion,
      registeredMigrations: migrations.size,
      historyEntries: history.length,
      operationInProgress,
      providerAvailable: Boolean(provider),
      rollbackSupported: Boolean(
        provider && typeof provider.rollback === "function"
      ),
      closed,
    });
  }

  function close() {
    if (operationInProgress) {
      throw createError(
        MIGRATION_MANAGER_ERRORS.OPERATION_IN_PROGRESS,
        "Cannot close Migration Manager during an active operation."
      );
    }

    if (closed) {
      return;
    }

    migrations.clear();
    history.length = 0;
    closed = true;
  }

  return Object.freeze({
    register,
    get,
    list,
    plan,
    migrate,
    rollback,
    getHistory,
    getStatus,
    close,
  });
}
