
/**
 * XSUS App — Schema Manager
 * Version: 1.0.0
 *
 * Independent schema registration, versioning and lifecycle module.
 * Uses in-memory storage and does not connect directly to a database.
 */

export const APP_SCHEMA_MANAGER_VERSION = "1.0.0";

export const APP_SCHEMA_MANAGER_CAPABILITIES = Object.freeze([
  "schema-registration",
  "schema-versioning",
  "schema-retrieval",
  "schema-listing",
  "schema-integrity",
  "schema-lifecycle"
]);

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

function normalizeSchema(input) {
  if (!isPlainObject(input)) {
    return null;
  }

  const id =
    typeof input.id === "string"
      ? input.id.trim()
      : "";

  const engine =
    typeof input.engine === "string"
      ? input.engine.trim().toLowerCase()
      : "";

  const schema = input.schema;

  if (!id || !engine || !isPlainObject(schema)) {
    return null;
  }

  if (!Array.isArray(schema.tables)) {
    return null;
  }

  return {
    id,
    engine,
    schema
  };
}

function validateConfig(config) {
  if (
    !Number.isInteger(config.maxSchemas) ||
    config.maxSchemas < 1
  ) {
    return createError(
      "INVALID_CONFIG",
      "maxSchemas must be a positive integer."
    );
  }

  return null;
}

export function createSchemaManager(options = {}) {
  const safeOptions = isPlainObject(options) ? options : {};

  const config = Object.freeze({
    maxSchemas: 1000,
    ...(isPlainObject(safeOptions.config) ? safeOptions.config : {})
  });

  const configError = validateConfig(config);

  const schemas = new Map();

  let closed = false;

  function assertOpen() {
    if (closed) {
      return createError(
        "SCHEMA_MANAGER_CLOSED",
        "Schema Manager is closed."
      );
    }

    return null;
  }

  function register(input) {
    const closedError = assertOpen();

    if (closedError) {
      return closedError;
    }

    if (configError) {
      return configError;
    }

    const normalized = normalizeSchema(input);

    if (!normalized) {
      return createError(
        "INVALID_SCHEMA",
        "A valid schema registration request is required."
      );
    }

    if (schemas.has(normalized.id)) {
      return createError(
        "SCHEMA_ALREADY_EXISTS",
        `Schema already exists: ${normalized.id}`
      );
    }

    if (schemas.size >= config.maxSchemas) {
      return createError(
        "SCHEMA_LIMIT_EXCEEDED",
        "The maximum number of registered schemas has been reached."
      );
    }

    const record = cloneAndFreeze({
      id: normalized.id,
      engine: normalized.engine,
      schema: normalized.schema,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    schemas.set(normalized.id, record);

    return Object.freeze({
      success: true,
      data: record
    });
  }

  function get(id) {
    const closedError = assertOpen();

    if (closedError) {
      return closedError;
    }

    if (typeof id !== "string" || !id.trim()) {
      return createError(
        "INVALID_SCHEMA_ID",
        "A valid schema ID is required."
      );
    }

    const record = schemas.get(id.trim());

    if (!record) {
      return createError(
        "SCHEMA_NOT_FOUND",
        `Schema not found: ${id}`
      );
    }

    return Object.freeze({
      success: true,
      data: record
    });
  }

  function update(id, input) {
    const closedError = assertOpen();

    if (closedError) {
      return closedError;
    }

    if (typeof id !== "string" || !id.trim()) {
      return createError(
        "INVALID_SCHEMA_ID",
        "A valid schema ID is required."
      );
    }

    const existing = schemas.get(id.trim());

    if (!existing) {
      return createError(
        "SCHEMA_NOT_FOUND",
        `Schema not found: ${id}`
      );
    }

    const normalized = normalizeSchema({
      ...input,
      id: id.trim()
    });

    if (!normalized) {
      return createError(
        "INVALID_SCHEMA",
        "A valid replacement schema is required."
      );
    }

    const record = cloneAndFreeze({
      id: existing.id,
      engine: normalized.engine,
      schema: normalized.schema,
      version: existing.version + 1,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    });

    schemas.set(existing.id, record);

    return Object.freeze({
      success: true,
      data: record
    });
  }

  function list() {
    const closedError = assertOpen();

    if (closedError) {
      return closedError;
    }

    return Object.freeze({
      success: true,
      data: Object.freeze([...schemas.values()]),
      metadata: Object.freeze({
        count: schemas.size
      })
    });
  }

  function remove(id) {
    const closedError = assertOpen();

    if (closedError) {
      return closedError;
    }

    if (typeof id !== "string" || !id.trim()) {
      return createError(
        "INVALID_SCHEMA_ID",
        "A valid schema ID is required."
      );
    }

    const key = id.trim();

    if (!schemas.has(key)) {
      return createError(
        "SCHEMA_NOT_FOUND",
        `Schema not found: ${key}`
      );
    }

    schemas.delete(key);

    return Object.freeze({
      success: true,
      data: Object.freeze({
        id: key,
        removed: true
      })
    });
  }

  function getStatus() {
    return Object.freeze({
      name: "XSUS App Schema Manager",
      version: APP_SCHEMA_MANAGER_VERSION,
      status: closed ? "closed" : "active",
      schemaCount: schemas.size,
      maxSchemas: config.maxSchemas
    });
  }

  function close() {
    if (closed) {
      return;
    }

    closed = true;
    schemas.clear();
  }

  return Object.freeze({
    name: "XSUS App Schema Manager",
    version: APP_SCHEMA_MANAGER_VERSION,
    capabilities: APP_SCHEMA_MANAGER_CAPABILITIES,
    register,
    get,
    update,
    list,
    remove,
    getStatus,
    close
  });
}
