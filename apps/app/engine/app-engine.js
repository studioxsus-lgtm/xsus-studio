/**
 * XSUS App Engine
 * Version: 1.2.0
 */

import { createAppArchitecture } from "../architect/app-architect.js";
import { createCodeGenerator } from "../code-generator/code-generator.js";

export const XSUS_APP_ENGINE_VERSION = "1.2.0";

export const APP_ENGINE_CAPABILITIES = Object.freeze([
  "app-architecture",
  "code-generation",
  "frontend-generation",
  "backend-generation",
  "database-design",
  "api-generation",
  "debugging",
  "testing",
  "application-export"
]);

const DEFAULT_CONFIG = Object.freeze({
  name: "XSUS App Engine",
  version: XSUS_APP_ENGINE_VERSION,
  maxPromptLength: 12000,
  supportedPlatforms: ["web", "mobile", "desktop", "fullstack"]
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
    platform: request.platform || "web",
    language: request.language || "auto",
    projectId: request.projectId || null,
    requirements: Array.isArray(request.requirements)
      ? [...request.requirements]
      : [],
    generateCode: request.generateCode === true,
    codeLanguage: request.codeLanguage || "typescript",
    framework: request.framework || null,
    projectType: request.projectType || "application",
    fileName: request.fileName || "generated-file"
  };
}

export function createAppEngine(options = {}) {
  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...options.config
  });

  const architect = options.architect || createAppArchitecture;

  const codeGenerator =
    options.codeGenerator ||
    createCodeGenerator({
      provider: options.codeProvider
    });

  async function processRequest(request) {
    const normalized = normalizeRequest(request);

    if (!normalized) {
      return createError(
        "INVALID_REQUEST",
        "A valid application request is required."
      );
    }

    if (normalized.prompt.length > config.maxPromptLength) {
      return createError(
        "PROMPT_TOO_LONG",
        "The application prompt exceeds the allowed length."
      );
    }

    if (!config.supportedPlatforms.includes(normalized.platform)) {
      return createError(
        "UNSUPPORTED_PLATFORM",
        `Unsupported platform: ${normalized.platform}`
      );
    }

    try {
      const architecture = await architect(normalized);

      if (!architecture || typeof architecture !== "object") {
        return createError(
          "ARCHITECTURE_FAILED",
          "Application architecture could not be created."
        );
      }

      let code = null;

      if (normalized.generateCode) {
        const generationResult = await codeGenerator.generate({
          prompt: normalized.prompt,
          language: normalized.codeLanguage,
          framework: normalized.framework,
          projectType: normalized.projectType,
          fileName: normalized.fileName,
          requirements: normalized.requirements
        });

        if (!generationResult.success) {
          return generationResult;
        }

        code = generationResult.data;
      }

      return Object.freeze({
        success: true,
        data: Object.freeze({
          projectId: normalized.projectId,
          architecture,
          code
        }),
        metadata: Object.freeze({
          engine: config.name,
          version: config.version,
          platform: normalized.platform,
          codeGenerated: code !== null
        })
      });
    } catch {
      return createError(
        "APP_ENGINE_FAILURE",
        "Application processing failed. Please try again."
      );
    }
  }

  return Object.freeze({
    name: config.name,
    version: config.version,
    capabilities: APP_ENGINE_CAPABILITIES,
    processRequest
  });
}
