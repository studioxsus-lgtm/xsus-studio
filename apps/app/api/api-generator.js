/**
 * XSUS App — API Generator
 * Version: 1.0.0
 *
 * Independent API architecture and generation module.
 * Uses an injected provider without direct dependency on XSUS AI Core.
 */

export const APP_API_GENERATOR_VERSION = "1.0.0";

export const APP_API_CAPABILITIES = Object.freeze([
  "api-architecture",
  "endpoint-generation",
  "http-method-design",
  "request-validation",
  "response-design",
  "api-documentation",
  "authentication-planning"
]);

export const APP_API_HTTP_METHODS = Object.freeze([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
]);

export const APP_API_STYLES = Object.freeze([
  "rest",
  "graphql",
  "rpc"
]);

const DEFAULT_CONFIG = Object.freeze({
  maxPromptLength: 12000,
  maxEndpoints: 300,
  defaultStyle: "rest"
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
    style: request.style || DEFAULT_CONFIG.defaultStyle,
    basePath: request.basePath || "/api/v1",
    authentication: request.authentication !== false,
    requirements: Array.isArray(request.requirements)
      ? [...request.requirements]
      : []
  };
}

function validateRequest(request, config) {
  if (!request) {
    return createError(
      "INVALID_REQUEST",
      "A valid API generation request is required."
    );
  }

  if (request.prompt.length > config.maxPromptLength) {
    return createError(
      "PROMPT_TOO_LONG",
      "The API prompt exceeds the allowed length."
    );
  }

  if (!APP_API_STYLES.includes(request.style)) {
    return createError(
      "UNSUPPORTED_API_STYLE",
      `Unsupported API style: ${request.style}`
    );
  }

  if (
    typeof request.basePath !== "string" ||
    !request.basePath.startsWith("/") ||
    request.basePath.startsWith("//") ||
    request.basePath.includes("..")
  ) {
    return createError(
      "INVALID_BASE_PATH",
      "The API base path must be a safe absolute path."
    );
  }

  return null;
}

function validateEndpoints(endpoints, maxEndpoints) {
  if (!Array.isArray(endpoints)) {
    return createError(
      "INVALID_ENDPOINTS",
      "The provider must return an endpoints array."
    );
  }

  if (endpoints.length > maxEndpoints) {
    return createError(
      "ENDPOINT_LIMIT_EXCEEDED",
      "The API exceeds the maximum endpoint count."
    );
  }

  const seen = new Set();
  const normalized = [];

  for (const endpoint of endpoints) {
    if (
      !endpoint ||
      typeof endpoint.path !== "string" ||
      !endpoint.path.startsWith("/") ||
      typeof endpoint.method !== "string"
    ) {
      return createError(
        "INVALID_ENDPOINT",
        "Every endpoint must contain a valid path and HTTP method."
      );
    }

    const method = endpoint.method.toUpperCase();

    if (!APP_API_HTTP_METHODS.includes(method)) {
      return createError(
        "UNSUPPORTED_HTTP_METHOD",
        `Unsupported HTTP method: ${endpoint.method}`
      );
    }

    const path = endpoint.path.trim();

    if (path.includes("..") || path.startsWith("//")) {
      return createError(
        "INVALID_ENDPOINT_PATH",
        "Endpoint paths must be safe application paths."
      );
    }

    const key = `${method}:${path}`;

    if (seen.has(key)) {
      return createError(
        "DUPLICATE_ENDPOINT",
        `Duplicate endpoint: ${key}`
      );
    }

    seen.add(key);

    normalized.push(
      Object.freeze({
        ...endpoint,
        path,
        method
      })
    );
  }

  return {
    success: true,
    endpoints: Object.freeze(normalized)
  };
}

export function createApiGenerator(options = {}) {
  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...options.config
  });

  const provider = options.provider || null;

  async function generate(request) {
    const normalized = normalizeRequest(request);
    const validationError = validateRequest(normalized, config);

    if (validationError) return validationError;

    if (!provider || typeof provider.generate !== "function") {
      return createError(
        "API_PROVIDER_UNAVAILABLE",
        "No API generation provider has been configured."
      );
    }

    try {
      const result = await provider.generate({
        prompt: normalized.prompt,
        style: normalized.style,
        basePath: normalized.basePath,
        authentication: normalized.authentication,
        requirements: normalized.requirements
      });

      if (!result || typeof result !== "object") {
        return createError(
          "INVALID_PROVIDER_RESPONSE",
          "The API provider returned an invalid response."
        );
      }

      const validation = validateEndpoints(
        result.endpoints,
        config.maxEndpoints
      );

      if (!validation.success) return validation;

      return Object.freeze({
        success: true,
        data: Object.freeze({
          style: normalized.style,
          basePath: normalized.basePath,
          authentication: normalized.authentication,
          endpoints: validation.endpoints,
          documentation: result.documentation || null,
          schemas: result.schemas || []
        }),
        metadata: Object.freeze({
          generatorVersion: APP_API_GENERATOR_VERSION,
          endpointCount: validation.endpoints.length
        })
      });
    } catch {
      return createError(
        "API_GENERATION_FAILED",
        "API generation failed. Please try again."
      );
    }
  }

  return Object.freeze({
    name: "XSUS App API Generator",
    version: APP_API_GENERATOR_VERSION,
    capabilities: APP_API_CAPABILITIES,
    generate
  });
}
