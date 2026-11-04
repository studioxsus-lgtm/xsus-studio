/**
 * XSUS App — Backend Builder
 * Version: 1.0.0
 *
 * Independent backend architecture and code-generation module.
 * Uses an injected provider without direct dependency on XSUS AI Core.
 */

export const APP_BACKEND_BUILDER_VERSION = "1.0.0";

export const APP_BACKEND_CAPABILITIES = Object.freeze([
  "backend-architecture",
  "server-generation",
  "business-logic-generation",
  "authentication-planning",
  "middleware-generation",
  "backend-code-generation"
]);

export const APP_BACKEND_FRAMEWORKS = Object.freeze([
  "node",
  "express",
  "fastify",
  "nestjs",
  "django",
  "flask",
  "spring",
  "aspnet",
  "laravel"
]);

const DEFAULT_CONFIG = Object.freeze({
  maxPromptLength: 12000,
  maxFiles: 100,
  defaultFramework: "express"
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
    framework: request.framework || DEFAULT_CONFIG.defaultFramework,
    database: request.database || null,
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
      "A valid backend request is required."
    );
  }

  if (request.prompt.length > config.maxPromptLength) {
    return createError(
      "PROMPT_TOO_LONG",
      "The backend prompt exceeds the allowed length."
    );
  }

  if (!APP_BACKEND_FRAMEWORKS.includes(request.framework)) {
    return createError(
      "UNSUPPORTED_FRAMEWORK",
      `Unsupported backend framework: ${request.framework}`
    );
  }

  return null;
}

function validateArtifacts(artifacts, maxFiles) {
  if (!Array.isArray(artifacts)) {
    return createError(
      "INVALID_ARTIFACTS",
      "The provider must return an artifacts array."
    );
  }

  if (artifacts.length > maxFiles) {
    return createError(
      "FILE_LIMIT_EXCEEDED",
      "The backend project exceeds the maximum file count."
    );
  }

  const normalized = [];
  const fileNames = new Set();

  for (const artifact of artifacts) {
    if (
      !artifact ||
      typeof artifact.fileName !== "string" ||
      !artifact.fileName.trim() ||
      typeof artifact.content !== "string"
    ) {
      return createError(
        "INVALID_ARTIFACT",
        "Every artifact must contain a fileName and content."
      );
    }

    const fileName = artifact.fileName.trim();

    if (
      fileName.startsWith("/") ||
      fileName.includes("\\") ||
      fileName.split("/").includes("..")
    ) {
      return createError(
        "INVALID_FILE_PATH",
        "Artifact paths must remain inside the project."
      );
    }

    if (fileNames.has(fileName)) {
      return createError(
        "DUPLICATE_FILE",
        `Duplicate backend file: ${fileName}`
      );
    }

    fileNames.add(fileName);

    normalized.push(
      Object.freeze({
        fileName,
        content: artifact.content,
        type: "backend"
      })
    );
  }

  return {
    success: true,
    artifacts: Object.freeze(normalized)
  };
}

export function createBackendBuilder(options = {}) {
  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...options.config
  });

  const provider = options.provider || null;

  async function build(request) {
    const normalized = normalizeRequest(request);
    const validationError = validateRequest(normalized, config);

    if (validationError) return validationError;

    if (!provider || typeof provider.generate !== "function") {
      return createError(
        "BACKEND_PROVIDER_UNAVAILABLE",
        "No backend generation provider has been configured."
      );
    }

    try {
      const result = await provider.generate({
        prompt: normalized.prompt,
        framework: normalized.framework,
        database: normalized.database,
        authentication: normalized.authentication,
        requirements: normalized.requirements
      });

      if (!result || typeof result !== "object") {
        return createError(
          "INVALID_PROVIDER_RESPONSE",
          "The backend provider returned an invalid response."
        );
      }

      const validation = validateArtifacts(
        result.artifacts,
        config.maxFiles
      );

      if (!validation.success) return validation;

      return Object.freeze({
        success: true,
        data: Object.freeze({
          framework: normalized.framework,
          database: normalized.database,
          authentication: normalized.authentication,
          artifacts: validation.artifacts
        }),
        metadata: Object.freeze({
          builderVersion: APP_BACKEND_BUILDER_VERSION,
          artifactCount: validation.artifacts.length
        })
      });
    } catch {
      return createError(
        "BACKEND_BUILD_FAILED",
        "Backend generation failed. Please try again."
      );
    }
  }

  return Object.freeze({
    name: "XSUS App Backend Builder",
    version: APP_BACKEND_BUILDER_VERSION,
    capabilities: APP_BACKEND_CAPABILITIES,
    build
  });
}
