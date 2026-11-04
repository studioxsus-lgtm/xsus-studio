/**
 * XSUS App — Code Generator
 * Version: 1.0.0
 *
 * Independent code-generation module.
 * Uses an injected provider when available.
 * Does not depend directly on XSUS AI Core.
 */

export const APP_CODE_GENERATOR_VERSION = "1.0.0";

export const APP_CODE_GENERATOR_CAPABILITIES = Object.freeze([
  "code-generation",
  "multi-language-generation",
  "project-scaffolding",
  "code-validation",
  "artifact-generation"
]);

export const APP_CODE_LANGUAGES = Object.freeze([
  "javascript",
  "typescript",
  "python",
  "java",
  "csharp",
  "go",
  "rust",
  "php",
  "html",
  "css",
  "sql"
]);

const DEFAULT_CONFIG = Object.freeze({
  maxPromptLength: 12000,
  maxFiles: 100,
  defaultLanguage: "typescript"
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
    language: request.language || DEFAULT_CONFIG.defaultLanguage,
    framework: request.framework || null,
    projectType: request.projectType || "application",
    fileName: request.fileName || "generated-file",
    requirements: Array.isArray(request.requirements)
      ? [...request.requirements]
      : []
  };
}

function validateRequest(request, config) {
  if (!request) {
    return createError(
      "INVALID_REQUEST",
      "A valid generation request is required."
    );
  }

  if (request.prompt.length > config.maxPromptLength) {
    return createError(
      "PROMPT_TOO_LONG",
      "The generation prompt exceeds the allowed length."
    );
  }

  if (!APP_CODE_LANGUAGES.includes(request.language)) {
    return createError(
      "UNSUPPORTED_LANGUAGE",
      `Unsupported programming language: ${request.language}`
    );
  }

  return null;
}

function createArtifact(fileName, language, content) {
  return Object.freeze({
    fileName,
    language,
    content,
    type: "source"
  });
}

export function createCodeGenerator(options = {}) {
  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...options.config
  });

  const provider = options.provider || null;

  async function generate(request) {
    const normalized = normalizeRequest(request);
    const validationError = validateRequest(normalized, config);

    if (validationError) {
      return validationError;
    }

    try {
      if (!provider || typeof provider.generate !== "function") {
        return createError(
          "GENERATOR_PROVIDER_UNAVAILABLE",
          "No code-generation provider has been configured."
        );
      }

      const result = await provider.generate({
        prompt: normalized.prompt,
        language: normalized.language,
        framework: normalized.framework,
        projectType: normalized.projectType,
        requirements: normalized.requirements
      });

      if (!result || typeof result !== "object") {
        return createError(
          "INVALID_PROVIDER_RESPONSE",
          "The generation provider returned an invalid response."
        );
      }

      if (!Array.isArray(result.artifacts)) {
        return createError(
          "INVALID_ARTIFACTS",
          "The provider response must contain an artifacts array."
        );
      }

      if (result.artifacts.length > config.maxFiles) {
        return createError(
          "FILE_LIMIT_EXCEEDED",
          "The generated project exceeds the maximum file count."
        );
      }

      const artifacts = result.artifacts.map((artifact, index) => {
        if (
          !artifact ||
          typeof artifact.fileName !== "string" ||
          typeof artifact.content !== "string"
        ) {
          throw new Error(`Invalid artifact at index ${index}.`);
        }

        return createArtifact(
          artifact.fileName,
          artifact.language || normalized.language,
          artifact.content
        );
      });

      return Object.freeze({
        success: true,
        data: Object.freeze({
          artifacts: Object.freeze(artifacts),
          language: normalized.language,
          projectType: normalized.projectType
        }),
        metadata: Object.freeze({
          generatorVersion: APP_CODE_GENERATOR_VERSION,
          artifactCount: artifacts.length
        })
      });
    } catch {
      return createError(
        "CODE_GENERATION_FAILED",
        "Code generation failed. Please try again."
      );
    }
  }

  return Object.freeze({
    name: "XSUS App Code Generator",
    version: APP_CODE_GENERATOR_VERSION,
    capabilities: APP_CODE_GENERATOR_CAPABILITIES,
    generate
  });
}
