/**
 * XSUS App — Application Exporter
 * Version: 1.0.0
 *
 * Independent application packaging and export module.
 * Uses an injected provider for actual build and packaging operations.
 * Does not depend directly on XSUS AI Core.
 */

export const APP_EXPORTER_VERSION = "1.0.0";

export const APP_EXPORT_CAPABILITIES = Object.freeze([
  "project-packaging",
  "web-export",
  "android-export",
  "ios-export",
  "desktop-export",
  "build-configuration",
  "export-validation"
]);

export const APP_EXPORT_TARGETS = Object.freeze([
  "web",
  "android",
  "ios",
  "desktop"
]);

export const APP_EXPORT_FORMATS = Object.freeze([
  "source",
  "archive",
  "build"
]);

const DEFAULT_CONFIG = Object.freeze({
  maxFiles: 5000,
  maxFileSize: 2000000,
  maxTotalSize: 50000000,
  maxPromptLength: 12000
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

  const prompt = typeof request.prompt === "string"
    ? request.prompt.trim()
    : "";

  if (!prompt) return null;

  return {
    prompt,
    target: request.target || "web",
    format: request.format || "source",
    projectName: request.projectName || "xsus-app",
    artifacts: Array.isArray(request.artifacts)
      ? request.artifacts
      : [],
    configuration:
      request.configuration &&
      typeof request.configuration === "object" &&
      !Array.isArray(request.configuration)
        ? { ...request.configuration }
        : {}
  };
}

function validateRequest(request, config) {
  if (!request) {
    return createError(
      "INVALID_REQUEST",
      "A valid export request is required."
    );
  }

  if (request.prompt.length > config.maxPromptLength) {
    return createError(
      "PROMPT_TOO_LONG",
      "The export prompt exceeds the allowed length."
    );
  }

  if (!APP_EXPORT_TARGETS.includes(request.target)) {
    return createError(
      "UNSUPPORTED_TARGET",
      `Unsupported export target: ${request.target}`
    );
  }

  if (!APP_EXPORT_FORMATS.includes(request.format)) {
    return createError(
      "UNSUPPORTED_FORMAT",
      `Unsupported export format: ${request.format}`
    );
  }

  if (
    typeof request.projectName !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(request.projectName)
  ) {
    return createError(
      "INVALID_PROJECT_NAME",
      "The project name contains invalid characters."
    );
  }

  return null;
}

function validateArtifacts(artifacts, config) {
  if (!Array.isArray(artifacts)) {
    return createError(
      "INVALID_ARTIFACTS",
      "Project artifacts must be provided as an array."
    );
  }

  if (artifacts.length > config.maxFiles) {
    return createError(
      "FILE_LIMIT_EXCEEDED",
      "The project exceeds the maximum file count."
    );
  }

  const files = [];
  const paths = new Set();
  let totalSize = 0;

  for (const artifact of artifacts) {
    if (
      !artifact ||
      typeof artifact.fileName !== "string" ||
      typeof artifact.content !== "string"
    ) {
      return createError(
        "INVALID_ARTIFACT",
        "Every artifact must contain a fileName and string content."
      );
    }

    const fileName = artifact.fileName.trim();

    if (
      !fileName ||
      fileName.startsWith("/") ||
      fileName.includes("\\") ||
      fileName.split("/").some(
        (part) => part === ".." || part === "" || part === "."
      ) ||
      /^[a-zA-Z]:/.test(fileName)
    ) {
      return createError(
        "INVALID_FILE_PATH",
        `Unsafe project file path: ${fileName}`
      );
    }

    if (paths.has(fileName)) {
      return createError(
        "DUPLICATE_FILE",
        `Duplicate project file: ${fileName}`
      );
    }

    paths.add(fileName);

    const size = new TextEncoder().encode(artifact.content).length;

    if (size > config.maxFileSize) {
      return createError(
        "FILE_SIZE_LIMIT_EXCEEDED",
        `Project file exceeds the size limit: ${fileName}`
      );
    }

    totalSize += size;

    if (totalSize > config.maxTotalSize) {
      return createError(
        "PROJECT_SIZE_LIMIT_EXCEEDED",
        "The project exceeds the maximum total size."
      );
    }

    files.push(
      Object.freeze({
        fileName,
        content: artifact.content
      })
    );
  }

  return {
    success: true,
    files: Object.freeze(files),
    totalSize
  };
}

export function createApplicationExporter(options = {}) {
  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...options.config
  });

  const provider = options.provider || null;

  async function exportApplication(request) {
    const normalized = normalizeRequest(request);
    const validationError = validateRequest(normalized, config);

    if (validationError) return validationError;

    const artifactValidation = validateArtifacts(
      normalized.artifacts,
      config
    );

    if (!artifactValidation.success) {
      return artifactValidation;
    }

    if (!provider || typeof provider.export !== "function") {
      return createError(
        "EXPORT_PROVIDER_UNAVAILABLE",
        "No application export provider has been configured."
      );
    }

    try {
      const result = await provider.export({
        prompt: normalized.prompt,
        target: normalized.target,
        format: normalized.format,
        projectName: normalized.projectName,
        artifacts: artifactValidation.files,
        configuration: normalized.configuration
      });

      if (!result || typeof result !== "object") {
        return createError(
          "INVALID_PROVIDER_RESPONSE",
          "The export provider returned an invalid response."
        );
      }

      if (typeof result.exportId !== "string" || !result.exportId.trim()) {
        return createError(
          "INVALID_EXPORT_RESULT",
          "The export provider did not return a valid export identifier."
        );
      }

      return Object.freeze({
        success: true,
        data: Object.freeze({
          exportId: result.exportId,
          projectName: normalized.projectName,
          target: normalized.target,
          format: normalized.format,
          status: typeof result.status === "string"
            ? result.status
            : "prepared",
          downloadUrl: typeof result.downloadUrl === "string"
            ? result.downloadUrl
            : null
        }),
        metadata: Object.freeze({
          exporterVersion: APP_EXPORTER_VERSION,
          fileCount: artifactValidation.files.length,
          totalSize: artifactValidation.totalSize
        })
      });
    } catch {
      return createError(
        "APPLICATION_EXPORT_FAILED",
        "Application export failed. Please try again."
      );
    }
  }

  return Object.freeze({
    name: "XSUS App Application Exporter",
    version: APP_EXPORTER_VERSION,
    capabilities: APP_EXPORT_CAPABILITIES,
    export: exportApplication
  });
}
