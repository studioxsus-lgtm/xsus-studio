
/**
 * XSUS App — Security Resource Adapter
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Serializimi kanonik i resource-ve.
 * - Deserializimi i resource-ve.
 * - Ruajtja e id dhe type pa humbje informacioni.
 * - Refuzimi i formateve të pavlefshme ose të paqarta.
 *
 * Ky adapter nuk ndryshon Authorization Manager
 * dhe nuk komunikon drejtpërdrejt me motorët e sigurisë.
 */

export const SECURITY_RESOURCE_ADAPTER_VERSION = "1.0.0";

export const SECURITY_RESOURCE_PREFIX = "xsus-resource:v1:";

export const SECURITY_RESOURCE_ERRORS = Object.freeze({
  INVALID_RESOURCE: "INVALID_RESOURCE",
  INVALID_SERIALIZED_RESOURCE: "INVALID_SERIALIZED_RESOURCE",
});

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function validateResource(resource) {
  if (!isPlainObject(resource)) {
    throw new TypeError(
      `[${SECURITY_RESOURCE_ERRORS.INVALID_RESOURCE}] Resource must be a plain object.`,
    );
  }

  if (
    typeof resource.id !== "string" ||
    !resource.id.trim() ||
    typeof resource.type !== "string" ||
    !resource.type.trim()
  ) {
    throw new TypeError(
      `[${SECURITY_RESOURCE_ERRORS.INVALID_RESOURCE}] Resource id and type must be non-empty strings.`,
    );
  }

  return Object.freeze({
    id: resource.id,
    type: resource.type,
  });
}

/**
 * Kthen një resource objekt në string kanonik.
 *
 * Shembull:
 * { id: "document:456", type: "file" }
 *
 * -> xsus-resource:v1:{"id":"document:456","type":"file"}
 */
export function encodeSecurityResource(resource) {
  const normalized = validateResource(resource);

  return (
    SECURITY_RESOURCE_PREFIX +
    JSON.stringify({
      id: normalized.id,
      type: normalized.type,
    })
  );
}

/**
 * Rikthen objektin e resource-it nga string-u kanonik.
 */
export function decodeSecurityResource(serializedResource) {
  if (
    typeof serializedResource !== "string" ||
    !serializedResource.startsWith(SECURITY_RESOURCE_PREFIX)
  ) {
    throw new TypeError(
      `[${SECURITY_RESOURCE_ERRORS.INVALID_SERIALIZED_RESOURCE}] Unsupported resource format.`,
    );
  }

  const payload = serializedResource.slice(
    SECURITY_RESOURCE_PREFIX.length,
  );

  let parsed;

  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new TypeError(
      `[${SECURITY_RESOURCE_ERRORS.INVALID_SERIALIZED_RESOURCE}] Resource payload is not valid JSON.`,
    );
  }

  let normalized;

  try {
    normalized = validateResource(parsed);
  } catch {
    throw new TypeError(
      `[${SECURITY_RESOURCE_ERRORS.INVALID_SERIALIZED_RESOURCE}] Resource payload is invalid.`,
    );
  }

  const canonical = encodeSecurityResource(normalized);

  if (canonical !== serializedResource) {
    throw new TypeError(
      `[${SECURITY_RESOURCE_ERRORS.INVALID_SERIALIZED_RESOURCE}] Resource payload is not canonical.`,
    );
  }

  return normalized;
}
