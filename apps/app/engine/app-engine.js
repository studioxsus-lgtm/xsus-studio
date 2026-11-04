/**
 * XSUS App — Main Application Engine
 * Version: 1.3.0
 *
 * Coordinates independent XSUS App modules.
 * Does not depend directly on XSUS AI Core.
 */

import { createAppArchitecture } from "../architect/app-architect.js";
import { createCodeGenerator } from "../code-generator/code-generator.js";
import { createFrontendBuilder } from "../frontend/frontend-builder.js";
import { createBackendBuilder } from "../backend/backend-builder.js";
import { createDatabaseDesigner } from "../database/database-designer.js";
import { createApiGenerator } from "../api/api-generator.js";
import { createDebuggingEngine } from "../debugging/debugging-engine.js";
import { createTestingEngine } from "../testing/testing-engine.js";
import { createApplicationExporter } from "../export/application-exporter.js";

export const XSUS_APP_ENGINE_VERSION = "1.3.0";

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

function createError(code, message, details = null) {
  return {
    success: false,
    error: { code, message, details }
  };
}

function normalizeRequest(request) {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    return null;
  }

  const prompt =
    typeof request.prompt === "string"
      ? request.prompt.trim()
      : "";

  if (!prompt) return null;

  const modules =
    request.modules &&
    typeof request.modules === "object" &&
    !Array.isArray(request.modules)
      ? request.modules
      : {};

  return {
    prompt,
    platform: request.platform || "web",
    language: request.language || "auto",
    projectId: request.projectId || null,
    requirements: Array.isArray(request.requirements)
      ? [...request.requirements]
      : [],
    modules: { ...modules },
    codeLanguage: request.codeLanguage || "typescript",
    framework: request.framework || null,
    projectType: request.projectType || "application",
    database: request.database || "postgresql",
    apiStyle: request.apiStyle || "rest",
    testType: request.testType || "unit",
    sourceCode: typeof request.sourceCode === "string"
      ? request.sourceCode
      : null,
    fileName: request.fileName || "generated-file",
    exportTarget: request.exportTarget || request.platform || "web",
    exportFormat: request.exportFormat || "source",
    projectName: request.projectName || "xsus-app",
    artifacts: Array.isArray(request.artifacts)
      ? request.artifacts
      : []
  };
}

function createModules(options) {
  const providers = options.providers || {};

  return Object.freeze({
    codeGenerator:
      options.codeGenerator ||
      createCodeGenerator({
        provider: options.codeProvider || providers.code
      }),

    frontendBuilder:
      options.frontendBuilder ||
      createFrontendBuilder({
        provider: providers.frontend
      }),

    backendBuilder:
      options.backendBuilder ||
      createBackendBuilder({
        provider: providers.backend
      }),

    databaseDesigner:
      options.databaseDesigner ||
      createDatabaseDesigner({
        provider: providers.database
      }),

    apiGenerator:
      options.apiGenerator ||
      createApiGenerator({
        provider: providers.api
      }),

    debuggingEngine:
      options.debuggingEngine ||
      createDebuggingEngine({
        provider: providers.debugging
      }),

    testingEngine:
      options.testingEngine ||
      createTestingEngine({
        provider: providers.testing
      }),

    applicationExporter:
      options.applicationExporter ||
      createApplicationExporter({
        provider: providers.export
      })
  });
}

export function createAppEngine(options = {}) {
  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...options.config
  });

  const architect = options.architect || createAppArchitecture;
  const modules = createModules(options);

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
      const architecture = await architect({
        prompt: normalized.prompt,
        platform: normalized.platform,
        language: normalized.language,
        projectId: normalized.projectId,
        requirements: normalized.requirements
      });

      if (!architecture || typeof architecture !== "object") {
        return createError(
          "ARCHITECTURE_FAILED",
          "Application architecture could not be created."
        );
      }

      const results = {};

      const tasks = [
        {
          key: "codeGeneration",
          enabled: normalized.modules.codeGeneration === true,
          run: () => modules.codeGenerator.generate({
            prompt: normalized.prompt,
            language: normalized.codeLanguage,
            framework: normalized.framework,
            projectType: normalized.projectType,
            fileName: normalized.fileName,
            requirements: normalized.requirements
          })
        },
        {
          key: "frontend",
          enabled: normalized.modules.frontend === true,
          run: () => modules.frontendBuilder.build({
            prompt: normalized.prompt,
            framework: normalized.framework || "react",
            requirements: normalized.requirements
          })
        },
        {
          key: "backend",
          enabled: normalized.modules.backend === true,
          run: () => modules.backendBuilder.build({
            prompt: normalized.prompt,
            framework: normalized.framework || "express",
            database: normalized.database,
            requirements: normalized.requirements
          })
        },
        {
          key: "database",
          enabled: normalized.modules.database === true,
          run: () => modules.databaseDesigner.design({
            prompt: normalized.prompt,
            engine: normalized.database,
            requirements: normalized.requirements
          })
        },
        {
          key: "api",
          enabled: normalized.modules.api === true,
          run: () => modules.apiGenerator.generate({
            prompt: normalized.prompt,
            style: normalized.apiStyle,
            requirements: normalized.requirements
          })
        },
        {
          key: "debugging",
          enabled: normalized.modules.debugging === true,
          run: () => modules.debuggingEngine.analyze({
            code: normalized.sourceCode || "",
            language: normalized.codeLanguage,
            fileName: normalized.fileName
          })
        },
        {
          key: "testing",
          enabled: normalized.modules.testing === true,
          run: () => modules.testingEngine.run({
            prompt: normalized.prompt,
            type: normalized.testType,
            framework: normalized.framework,
            sourceCode: normalized.sourceCode,
            execute: normalized.modules.executeTests === true,
            requirements: normalized.requirements
          })
        },
        {
          key: "export",
          enabled: normalized.modules.export === true,
          run: () => modules.applicationExporter.export({
            prompt: normalized.prompt,
            target: normalized.exportTarget,
            format: normalized.exportFormat,
            projectName: normalized.projectName,
            artifacts: normalized.artifacts
          })
        }
      ];

      for (const task of tasks) {
        if (!task.enabled) continue;

        try {
          results[task.key] = await task.run();
        } catch {
          results[task.key] = createError(
            "MODULE_EXECUTION_FAILED",
            `The ${task.key} module could not complete its operation.`
          );
        }
      }

      const failedModules = Object.entries(results)
        .filter(([, result]) => !result || result.success !== true)
        .map(([name]) => name);

      return Object.freeze({
        success: true,
        data: Object.freeze({
          projectId: normalized.projectId,
          architecture,
          modules: Object.freeze(results)
        }),
        metadata: Object.freeze({
          engine: config.name,
          version: config.version,
          platform: normalized.platform,
          executedModules: Object.keys(results),
          failedModules
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
