/**
 * XSUS App — Database Designer
 * Version: 1.0.0
 *
 * Independent database architecture and schema generation module.
 * Uses an injected provider without direct dependency on XSUS AI Core.
 */

export const APP_DATABASE_DESIGNER_VERSION = "1.0.0";

export const APP_DATABASE_CAPABILITIES = Object.freeze([
  "database-architecture",
  "schema-design",
  "table-design",
  "relationship-design",
  "index-planning",
  "migration-generation"
]);

export const APP_DATABASE_ENGINES = Object.freeze([
  "postgresql",
  "mysql",
  "sqlite",
  "mongodb",
  "mariadb",
  "sql-server"
]);

const DEFAULT_CONFIG = Object.freeze({
  maxPromptLength: 12000,
  maxTables: 200,
  defaultEngine: "postgresql"
});

function createError(code, message) {
  return {
    success: false,
    error: { code, message }
  };
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function cloneAndFreeze(value, seen = new WeakMap()) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  const clone = Array.isArray(value) ? [] : {};

  seen.set(value, clone);

  for (const key of Object.keys(value)) {
    clone[key] = cloneAndFreeze(value[key], seen);
  }

  return Object.freeze(clone);
}

function normalizeRequest(request) {
  if (!isPlainObject(request)) {
    return null;
  }

  const prompt =
    typeof request.prompt === "string"
      ? request.prompt.trim()
      : "";

  if (!prompt) {
    return null;
  }

  const engine =
    typeof request.engine === "string" && request.engine.trim()
      ? request.engine.trim().toLowerCase()
      : DEFAULT_CONFIG.defaultEngine;

  const projectType =
    typeof request.projectType === "string" &&
    request.projectType.trim()
      ? request.projectType.trim()
      : "application";

  const requirements = Array.isArray(request.requirements)
    ? request.requirements.filter(
        (item) => typeof item === "string" && item.trim()
      ).map((item) => item.trim())
    : [];

  return {
    prompt,
    engine,
    projectType,
    requirements,
    includeIndexes: request.includeIndexes !== false,
    includeMigrations: request.includeMigrations !== false
  };
}

function validateConfig(config) {
  if (
    !Number.isInteger(config.maxPromptLength) ||
    config.maxPromptLength < 1
  ) {
    return createError(
      "INVALID_CONFIG",
      "maxPromptLength must be a positive integer."
    );
  }

  if (
    !Number.isInteger(config.maxTables) ||
    config.maxTables < 1
  ) {
    return createError(
      "INVALID_CONFIG",
      "maxTables must be a positive integer."
    );
  }

  if (
    typeof config.defaultEngine !== "string" ||
    !APP_DATABASE_ENGINES.includes(config.defaultEngine)
  ) {
    return createError(
      "INVALID_CONFIG",
      "The default database engine is not supported."
    );
  }

  return null;
}

function validateRequest(request, config) {
  if (!request) {
    return createError(
      "INVALID_REQUEST",
      "A valid database design request is required."
    );
  }

  if (request.prompt.length > config.maxPromptLength) {
    return createError(
      "PROMPT_TOO_LONG",
      "The database prompt exceeds the allowed length."
    );
  }

  if (!APP_DATABASE_ENGINES.includes(request.engine)) {
    return createError(
      "UNSUPPORTED_DATABASE",
      `Unsupported database engine: ${request.engine}`
    );
  }

  return null;
}

function validateSchema(schema, maxTables) {
  if (!isPlainObject(schema)) {
    return createError(
      "INVALID_SCHEMA",
      "The provider must return a valid schema object."
    );
  }

  if (!Array.isArray(schema.tables)) {
    return createError(
      "INVALID_TABLES",
      "The database schema must contain a tables array."
    );
  }

  if (schema.tables.length > maxTables) {
    return createError(
      "TABLE_LIMIT_EXCEEDED",
      "The database schema exceeds the maximum table count."
    );
  }

  const tableNames = new Set();

  for (const table of schema.tables) {
    if (
      !isPlainObject(table) ||
      typeof table.name !== "string" ||
      !table.name.trim() ||
      !Array.isArray(table.columns)
    ) {
      return createError(
        "INVALID_TABLE",
        "Every table must have a name and columns array."
      );
    }

    const tableName = table.name.trim().toLowerCase();

    if (tableNames.has(tableName)) {
      return createError(
        "DUPLICATE_TABLE",
        `Duplicate database table: ${table.name}`
      );
    }

    tableNames.add(tableName);

    const columnNames = new Set();

    for (const column of table.columns) {
      if (
        !isPlainObject(column) ||
        typeof column.name !== "string" ||
        !column.name.trim() ||
        typeof column.type !== "string" ||
        !column.type.trim()
      ) {
        return createError(
          "INVALID_COLUMN",
          `Table ${table.name} contains an invalid column.`
        );
      }

      const columnName = column.name.trim().toLowerCase();

      if (columnNames.has(columnName)) {
        return createError(
          "DUPLICATE_COLUMN",
          `Duplicate column in table ${table.name}: ${column.name}`
        );
      }

      columnNames.add(columnName);
    }
  }

  return {
    success: true,
    schema: cloneAndFreeze(schema)
  };
}

function validateProviderList(value, fieldName) {
  if (value === undefined || value === null) {
    return {
      success: true,
      value: Object.freeze([])
    };
  }

  if (!Array.isArray(value)) {
    return createError(
      "INVALID_PROVIDER_RESPONSE",
      `Provider ${fieldName} must be an array.`
    );
  }

  return {
    success: true,
    value: cloneAndFreeze(value)
  };
}

export function createDatabaseDesigner(options = {}) {
  const safeOptions = isPlainObject(options) ? options : {};

  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...(isPlainObject(safeOptions.config) ? safeOptions.config : {})
  });

  const configError = validateConfig(config);

  const provider = safeOptions.provider || null;

  async function design(request) {
    if (configError) {
      return configError;
    }

    const normalized = normalizeRequest(request);
    const validationError = validateRequest(normalized, config);

    if (validationError) {
      return validationError;
    }

    if (!provider || typeof provider.design !== "function") {
      return createError(
        "DATABASE_PROVIDER_UNAVAILABLE",
        "No database design provider has been configured."
      );
    }

    try {
      const result = await provider.design({
        prompt: normalized.prompt,
        engine: normalized.engine,
        projectType: normalized.projectType,
        requirements: [...normalized.requirements],
        includeIndexes: normalized.includeIndexes,
        includeMigrations: normalized.includeMigrations
      });

      if (!isPlainObject(result)) {
        return createError(
          "INVALID_PROVIDER_RESPONSE",
          "The database provider returned an invalid response."
        );
      }

      const validation = validateSchema(
        result.schema,
        config.maxTables
      );

      if (!validation.success) {
        return validation;
      }

      const indexes = validateProviderList(
        result.indexes,
        "indexes"
      );

      if (!indexes.success) {
        return indexes;
      }

      const migrations = validateProviderList(
        result.migrations,
        "migrations"
      );

      if (!migrations.success) {
        return migrations;
      }

      return Object.freeze({
        success: true,
        data: Object.freeze({
          engine: normalized.engine,
          schema: validation.schema,
          indexes: indexes.value,
          migrations: migrations.value
        }),
        metadata: Object.freeze({
          designerVersion: APP_DATABASE_DESIGNER_VERSION,
          tableCount: validation.schema.tables.length
        })
      });
    } catch {
      return createError(
        "DATABASE_DESIGN_FAILED",
        "Database design failed. Please try again."
      );
    }
  }

  return Object.freeze({
    name: "XSUS App Database Designer",
    version: APP_DATABASE_DESIGNER_VERSION,
    capabilities: APP_DATABASE_CAPABILITIES,
    design
  });
}
