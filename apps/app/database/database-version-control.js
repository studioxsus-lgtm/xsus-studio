
/**
 * XSUS App — Database Version Control
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Regjistrimi dhe gjurmimi i versioneve të databazës.
 * - Ruajtja e snapshot-eve të skemës.
 * - Krahasimi i dy versioneve.
 * - Identifikimi i ndryshimeve dhe ndryshimeve kritike.
 * - Kontrolli i përputhshmërisë.
 * - Planifikimi dhe ekzekutimi i rikthimit përmes provider-it.
 *
 * Storage: RAM
 * Dependencies: vetëm API të injektuara përmes options.
 */

export const DATABASE_VERSION_CONTROL_VERSION = "1.0.0";

export const DATABASE_VERSION_CONTROL_ERRORS = Object.freeze({
  INVALID_CONFIG: "INVALID_DATABASE_VERSION_CONFIG",
  INVALID_VERSION: "INVALID_DATABASE_VERSION",
  DUPLICATE_VERSION: "DUPLICATE_DATABASE_VERSION",
  VERSION_NOT_FOUND: "DATABASE_VERSION_NOT_FOUND",
  INVALID_COMPARISON: "INVALID_DATABASE_VERSION_COMPARISON",
  INCOMPATIBLE_VERSION: "INCOMPATIBLE_DATABASE_VERSION",
  RESTORE_UNSUPPORTED: "DATABASE_VERSION_RESTORE_UNSUPPORTED",
  RESTORE_FAILED: "DATABASE_VERSION_RESTORE_FAILED",
  MANAGER_CLOSED: "DATABASE_VERSION_CONTROL_CLOSED"
});

const DEFAULT_CONFIG = Object.freeze({
  maxVersions: 1000,
  maxHistory: 5000
});

const BREAKING_CHANGE_TYPES = new Set([
  "DROP_TABLE",
  "DROP_COLUMN",
  "RENAME_TABLE",
  "RENAME_COLUMN",
  "CHANGE_COLUMN_TYPE",
  "REMOVE_CONSTRAINT",
  "REMOVE_INDEX"
]);

function createError(code, message, cause) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;

  if (cause !== undefined) {
    error.cause = cause;
  }

  return error;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function cloneValue(value) {
  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    throw createError(
      DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION,
      "Të dhënat duhet të jenë JSON-serializable.",
      error
    );
  }
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }

  return value;
}

function immutableClone(value) {
  return deepFreeze(cloneValue(value));
}

function requireString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createError(
      DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION,
      `Fusha "${fieldName}" duhet të jetë tekst jo bosh.`
    );
  }

  return value.trim();
}

function createTimestamp() {
  return new Date().toISOString();
}

function normalizeCompatibility(input = {}) {
  if (!isPlainObject(input)) {
    throw createError(
      DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION,
      "compatibility duhet të jetë objekt."
    );
  }

  const breakingChanges = Array.isArray(input.breakingChanges)
    ? input.breakingChanges.map((item) =>
        requireString(item, "breakingChanges")
      )
    : [];

  return {
    backwardCompatible: input.backwardCompatible !== false,
    forwardCompatible: input.forwardCompatible === true,
    breakingChanges
  };
}

function normalizeChange(input) {
  if (!isPlainObject(input)) {
    throw createError(
      DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION,
      "Çdo ndryshim duhet të jetë objekt."
    );
  }

  const type = requireString(input.type, "change.type").toUpperCase();

  return {
    id: input.id
      ? requireString(input.id, "change.id")
      : `change-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    description: typeof input.description === "string"
      ? input.description
      : "",
    breaking: input.breaking === true || BREAKING_CHANGE_TYPES.has(type),
    details: input.details === undefined
      ? {}
      : cloneValue(input.details),
    createdAt: input.createdAt || createTimestamp()
  };
}

function normalizeConfig(options) {
  const config = {
    ...DEFAULT_CONFIG,
    ...(options.config || {})
  };

  if (
    !Number.isInteger(config.maxVersions) ||
    config.maxVersions < 1 ||
    !Number.isInteger(config.maxHistory) ||
    config.maxHistory < 1
  ) {
    throw createError(
      DATABASE_VERSION_CONTROL_ERRORS.INVALID_CONFIG,
      "maxVersions dhe maxHistory duhet të jenë numra të plotë pozitivë."
    );
  }

  return config;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(value).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function compareValues(source, target, path = "") {
  const differences = [];

  if (stableStringify(source) === stableStringify(target)) {
    return differences;
  }

  if (
    source === null ||
    target === null ||
    typeof source !== "object" ||
    typeof target !== "object" ||
    Array.isArray(source) !== Array.isArray(target)
  ) {
    differences.push({
      path: path || "$",
      type: "VALUE_CHANGED",
      source: cloneValue(source),
      target: cloneValue(target)
    });

    return differences;
  }

  const sourceKeys = Object.keys(source);
  const targetKeys = Object.keys(target);
  const allKeys = new Set([...sourceKeys, ...targetKeys]);

  for (const key of allKeys) {
    const nextPath = path ? `${path}.${key}` : key;
    const existsInSource = Object.prototype.hasOwnProperty.call(
      source,
      key
    );
    const existsInTarget = Object.prototype.hasOwnProperty.call(
      target,
      key
    );

    if (!existsInSource) {
      differences.push({
        path: nextPath,
        type: "ADDED",
        source: undefined,
        target: cloneValue(target[key])
      });
      continue;
    }

    if (!existsInTarget) {
      differences.push({
        path: nextPath,
        type: "REMOVED",
        source: cloneValue(source[key]),
        target: undefined
      });
      continue;
    }

    differences.push(
      ...compareValues(source[key], target[key], nextPath)
    );
  }

  return differences;
}

export function createDatabaseVersionControl(options = {}) {
  if (!isPlainObject(options)) {
    throw createError(
      DATABASE_VERSION_CONTROL_ERRORS.INVALID_CONFIG,
      "Options duhet të jetë objekt."
    );
  }

  const config = normalizeConfig(options);

  const versions = new Map();
  const history = [];

  const restoreProvider = options.restoreProvider || null;

  if (
    restoreProvider !== null &&
    (
      typeof restoreProvider !== "object" ||
      typeof restoreProvider.restore !== "function"
    )
  ) {
    throw createError(
      DATABASE_VERSION_CONTROL_ERRORS.INVALID_CONFIG,
      "restoreProvider duhet të implementojë restore()."
    );
  }

  let closed = false;

  function assertOpen() {
    if (closed) {
      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.MANAGER_CLOSED,
        "Database Version Control është mbyllur."
      );
    }
  }

  function addHistory(event) {
    history.push(
      immutableClone({
        ...event,
        timestamp: event.timestamp || createTimestamp()
      })
    );

    while (history.length > config.maxHistory) {
      history.shift();
    }
  }

  function getInternalVersion(id) {
    const normalizedId = requireString(id, "id");
    const record = versions.get(normalizedId);

    if (!record) {
      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.VERSION_NOT_FOUND,
        `Versioni "${normalizedId}" nuk u gjet.`
      );
    }

    return record;
  }

  function register(input) {
    assertOpen();

    if (!isPlainObject(input)) {
      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION,
        "Input duhet të jetë objekt."
      );
    }

    const id = requireString(input.id, "id");
    const version = requireString(input.version, "version");
    const schemaId = requireString(input.schemaId, "schemaId");

    if (versions.has(id)) {
      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.DUPLICATE_VERSION,
        `ID "${id}" është regjistruar më parë.`
      );
    }

    if (versions.size >= config.maxVersions) {
      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.INVALID_CONFIG,
        "Është arritur kufiri maksimal i versioneve."
      );
    }

    for (const existing of versions.values()) {
      if (
        existing.schemaId === schemaId &&
        existing.version === version
      ) {
        throw createError(
          DATABASE_VERSION_CONTROL_ERRORS.DUPLICATE_VERSION,
          `Versioni "${version}" ekziston për skemën "${schemaId}".`
        );
      }
    }

    if (
      input.schemaSnapshot !== undefined &&
      !isPlainObject(input.schemaSnapshot)
    ) {
      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION,
        "schemaSnapshot duhet të jetë objekt."
      );
    }

    const migrationIds = input.migrationIds || [];

    if (
      !Array.isArray(migrationIds) ||
      migrationIds.some(
        (item) => typeof item !== "string" || !item.trim()
      )
    ) {
      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION,
        "migrationIds duhet të jetë listë me ID tekstuale."
      );
    }

    const changes = input.changes || [];

    if (!Array.isArray(changes)) {
      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION,
        "changes duhet të jetë listë."
      );
    }

    const normalizedChanges = changes.map(normalizeChange);
    const compatibility = normalizeCompatibility(
      input.compatibility || {}
    );

    const hasBreakingChanges = normalizedChanges.some(
      (change) => change.breaking
    );

    if (
      hasBreakingChanges &&
      compatibility.breakingChanges.length === 0
    ) {
      compatibility.breakingChanges = normalizedChanges
        .filter((change) => change.breaking)
        .map((change) => change.description || change.type);
    }

    const timestamp = createTimestamp();

    const record = immutableClone({
      id,
      version,
      schemaId,
      migrationIds: [...migrationIds],
      schemaSnapshot: input.schemaSnapshot === undefined
        ? null
        : input.schemaSnapshot,
      changes: normalizedChanges,
      compatibility,
      metadata: input.metadata === undefined
        ? {}
        : input.metadata,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    versions.set(id, record);

    addHistory({
      action: "VERSION_REGISTERED",
      versionId: id,
      version
    });

    return immutableClone(record);
  }

  function get(id) {
    assertOpen();

    return immutableClone(getInternalVersion(id));
  }

  function list() {
    assertOpen();

    return [...versions.values()]
      .map(immutableClone)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function compare(sourceVersionId, targetVersionId) {
    assertOpen();

    const source = getInternalVersion(sourceVersionId);
    const target = getInternalVersion(targetVersionId);

    if (source.schemaId !== target.schemaId) {
      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.INVALID_COMPARISON,
        "Nuk mund të krahasohen versione të skemave të ndryshme."
      );
    }

    const differences = compareValues(
      source.schemaSnapshot,
      target.schemaSnapshot,
      "schemaSnapshot"
    );

    const changeTypes = {
      added: differences.filter((item) => item.type === "ADDED").length,
      removed: differences.filter((item) => item.type === "REMOVED").length,
      modified: differences.filter(
        (item) => item.type === "VALUE_CHANGED"
      ).length
    };

    const breakingChanges = target.changes
      .filter((change) => change.breaking)
      .map((change) => ({
        id: change.id,
        type: change.type,
        description: change.description
      }));

    return immutableClone({
      sourceVersionId: source.id,
      targetVersionId: target.id,
      sourceVersion: source.version,
      targetVersion: target.version,
      schemaId: source.schemaId,
      identical: differences.length === 0,
      summary: {
        total: differences.length,
        ...changeTypes,
        breakingChanges: breakingChanges.length
      },
      differences,
      breakingChanges,
      comparedAt: createTimestamp()
    });
  }

  function trackChange(input) {
    assertOpen();

    if (!isPlainObject(input)) {
      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION,
        "Input i ndryshimit duhet të jetë objekt."
      );
    }

    const versionId = requireString(input.versionId, "versionId");
    const record = getInternalVersion(versionId);
    const change = normalizeChange(input.change || input);

    const updated = immutableClone({
      ...record,
      changes: [...record.changes, change],
      compatibility: {
        ...record.compatibility,
        breakingChanges: change.breaking
          ? [
              ...record.compatibility.breakingChanges,
              change.description || change.type
            ]
          : [...record.compatibility.breakingChanges]
      },
      updatedAt: createTimestamp()
    });

    versions.set(versionId, updated);

    addHistory({
      action: "CHANGE_TRACKED",
      versionId,
      changeId: change.id,
      changeType: change.type
    });

    return immutableClone(updated);
  }

  function checkCompatibility(sourceVersionId, targetVersionId) {
    assertOpen();

    const comparison = compare(sourceVersionId, targetVersionId);
    const target = getInternalVersion(targetVersionId);

    const breakingChanges = [
      ...comparison.breakingChanges,
      ...target.compatibility.breakingChanges
    ];

    const uniqueBreakingChanges = [...new Set(breakingChanges)];

    return immutableClone({
      sourceVersionId: comparison.sourceVersionId,
      targetVersionId: comparison.targetVersionId,
      backwardCompatible:
        target.compatibility.backwardCompatible &&
        uniqueBreakingChanges.length === 0,
      forwardCompatible:
        target.compatibility.forwardCompatible,
      compatible: uniqueBreakingChanges.length === 0,
      breakingChanges: uniqueBreakingChanges,
      checkedAt: createTimestamp()
    });
  }

  function getHistory() {
    assertOpen();

    return history.map(immutableClone);
  }

  function planRestore(targetVersionId) {
    assertOpen();

    const target = getInternalVersion(targetVersionId);

    const snapshotAvailable = target.schemaSnapshot !== null;
    const providerAvailable = restoreProvider !== null;

    return immutableClone({
      targetVersionId: target.id,
      targetVersion: target.version,
      schemaId: target.schemaId,
      snapshotAvailable,
      providerAvailable,
      executable: snapshotAvailable && providerAvailable,
      status: snapshotAvailable && providerAvailable
        ? "READY"
        : "UNAVAILABLE",
      reason: !snapshotAvailable
        ? "SCHEMA_SNAPSHOT_UNAVAILABLE"
        : !providerAvailable
          ? "RESTORE_PROVIDER_UNAVAILABLE"
          : null,
      plannedAt: createTimestamp()
    });
  }

  async function restore(targetVersionId) {
    assertOpen();

    const target = getInternalVersion(targetVersionId);
    const plan = planRestore(targetVersionId);

    if (!plan.executable) {
      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.RESTORE_UNSUPPORTED,
        `Rikthimi nuk mund të ekzekutohet: ${plan.reason}.`
      );
    }

    try {
      const result = await restoreProvider.restore({
        version: immutableClone(target),
        snapshot: immutableClone(target.schemaSnapshot)
      });

      assertOpen();

      addHistory({
        action: "VERSION_RESTORED",
        versionId: target.id,
        version: target.version,
        providerResult: result === undefined ? null : result
      });

      return immutableClone({
        success: true,
        targetVersionId: target.id,
        targetVersion: target.version,
        result: result === undefined ? null : result,
        restoredAt: createTimestamp()
      });
    } catch (error) {
      addHistory({
        action: "RESTORE_FAILED",
        versionId: target.id,
        version: target.version,
        error: error.message || "Unknown restore error"
      });

      throw createError(
        DATABASE_VERSION_CONTROL_ERRORS.RESTORE_FAILED,
        `Rikthimi i versionit "${target.version}" dështoi.`,
        error
      );
    }
  }

  function getStatus() {
    return immutableClone({
      version: DATABASE_VERSION_CONTROL_VERSION,
      closed,
      storage: "RAM",
      versionCount: versions.size,
      historyCount: history.length,
      maxVersions: config.maxVersions,
      maxHistory: config.maxHistory,
      restoreProviderAvailable: restoreProvider !== null
    });
  }

  function close() {
    if (closed) {
      return {
        success: true,
        alreadyClosed: true
      };
    }

    versions.clear();
    history.length = 0;
    closed = true;

    return {
      success: true,
      alreadyClosed: false
    };
  }

  return Object.freeze({
    register,
    get,
    list,
    compare,
    trackChange,
    checkCompatibility,
    getHistory,
    planRestore,
    restore,
    getStatus,
    close
  });
}
