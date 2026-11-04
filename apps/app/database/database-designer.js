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

function normalizeRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return null;
  }

  const prompt =
    typeof request.prompt === "string"
      ? request.prompt.trim()
      : "";

  if (!prompt) return null;

  return {
    prompt,
    engine: request.engine || DEFAULT_CONFIG.defaultEngine,
    projectType: request.projectType || "application",
    requirements: Array.isArray(request.requirements)
      ? [...request.requirements]
      : [],
    includeIndexes: request.includeIndexes !== false,
    includeMigrations: request.includeMigrations !== false
  };
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
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
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

  const names = new Set();

  for (const table of schema.tables) {
    if (
      !table ||
      typeof table.name !== "string" ||
      !table.name.trim() ||
      !Array.isArray(table.columns)
    ) {
      return createError(
        "INVALID_TABLE",
        "Every table must have a name and columns array."
      );
    }

    const name = table.name.trim().toLowerCase();

    if (names.has(name)) {
      return createError(
        "DUPLICATE_TABLE",
        `Duplicate database table: ${table.name}`
      );
    }

    names.add(name);

    const columnNames = new Set();

    for (const column of table.columns) {
      if (
        !column ||
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
    schema: Object.freeze({
      ...schema,
      tables: Object.freeze(
        schema.tables.map((table) =>
          Object.freeze({
            ...table,
            columns: Object.freeze(
              table.columns.map((column) => Object.freeze({ ...column }))
            )
          })
        )
      )
    })
  };
}

export function createDatabaseDesigner(options = {}) {
  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...options.config
  });

  const provider = options.provider || null;

  async function design(request) {
    const normalized = normalizeRequest(request);
    const validationError = validateRequest(normalized, config);

    if (validationError) return validationError;

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
        requirements: normalized.requirements,
        includeIndexes: normalized.includeIndexes,
        includeMigrations: normalized.includeMigrations
      });

      if (!result || typeof result !== "object") {
        return createError(
          "INVALID_PROVIDER_RESPONSE",
          "The database provider returned an invalid response."
        );
      }

      const validation = validateSchema(
        result.schema,
        config.maxTables
      );

      if (!validation.success) return validation;

      return Object.freeze({
        success: true,
        data: Object.freeze({
          engine: normalized.engine,
          schema: validation.schema,
          indexes: Array.isArray(result.indexes)
            ? Object.freeze([...result.indexes])
            : Object.freeze([]),
          migrations: Array.isArray(result.migrations)
            ? Object.freeze([...result.migrations])
            : Object.freeze([])
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
