/**

* XSUS App — Main Application Engine
* Version: 1.5.0
* 
* Coordinates independent XSUS App modules.
* Integrates XSUS AI Core and Hyper XSUS Core
* through the App Intelligence integration layer.
  */

import { createAppArchitecture } from "../architect/app-architect.js";
import { APP_ARCHITECT_TYPES } from "../architect/app-architect.js";
import { APP_PLATFORMS } from "../contracts/app-contracts.js";

import { createCodeGenerator } from "../code-generator/code-generator.js";
import { createFrontendBuilder } from "../frontend/frontend-builder.js";
import { createBackendBuilder } from "../backend/backend-builder.js";
import { createDatabaseDesigner } from "../database/database-designer.js";
import { createApiGenerator } from "../api/api-generator.js";
import { createDebuggingEngine } from "../debugging/debugging-engine.js";
import { createTestingEngine } from "../testing/testing-engine.js";
import { createApplicationExporter } from "../export/application-exporter.js";
import { createAppIntelligence } from "../integration/app-intelligence.js";

export const XSUS_APP_ENGINE_VERSION = "1.5.0";

export const APP_ENGINE_CAPABILITIES = Object.freeze([
"app-architecture",
"code-generation",
"frontend-generation",
"backend-generation",
"database-design",
"api-generation",
"debugging",
"testing",
"application-export",
"xsus-ai-core-integration",
"hyper-xsus-core-integration",
"knowledge-retrieval",
"android-platform",
"ios-platform",
"desktop-platform",
"web-platform",
"engine-lifecycle-management",
"module-failure-reporting"
]);

const DEFAULT_CONFIG = Object.freeze({
name: "XSUS App Engine",
version: XSUS_APP_ENGINE_VERSION,
maxPromptLength: 12000,
supportedPlatforms: APP_PLATFORMS
});

function createError(code, message, details = null) {
return {
success: false,
error: {
code,
message,
details
}
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

if (!prompt) {
return null;
}

const modules =
request.modules &&
typeof request.modules === "object" &&
!Array.isArray(request.modules)
? request.modules
: {};

return {
prompt,
platform: request.platform || "web",
architectureType: request.architectureType || null,
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

sourceCode:
  typeof request.sourceCode === "string"
    ? request.sourceCode
    : null,

fileName: request.fileName || "generated-file",

exportTarget:
  request.exportTarget ||
  request.platform ||
  "web",

exportFormat: request.exportFormat || "source",
projectName: request.projectName || "xsus-app",

artifacts: Array.isArray(request.artifacts)
  ? request.artifacts
  : [],

useIntelligence: request.useIntelligence === true,
retrieveKnowledge: request.retrieveKnowledge === true

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
...options.config,
supportedPlatforms: Object.freeze([
...(options.config?.supportedPlatforms || APP_PLATFORMS)
])
});

if (
!Number.isInteger(config.maxPromptLength) ||
config.maxPromptLength < 1
) {
throw new TypeError(
"maxPromptLength must be a positive integer."
);
}

if (
!Array.isArray(config.supportedPlatforms) ||
config.supportedPlatforms.length === 0 ||
config.supportedPlatforms.some(
platform => !APP_PLATFORMS.includes(platform)
)
) {
throw new TypeError(
"Engine configuration contains unsupported platforms."
);
}

const architect = options.architect || createAppArchitecture;
const modules = createModules(options);

const intelligence =
options.intelligence === false
? null
: options.intelligenceInstance ||
createAppIntelligence(options.intelligenceOptions || {});

let closed = false;
let closeError = null;

function assertOpen() {
if (closed) {
throw new Error("XSUS App Engine is closed.");
}
}

async function processRequest(request) {
if (closed) {
return createError(
"ENGINE_CLOSED",
"XSUS App Engine is closed and cannot process requests."
);
}

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

if (
  normalized.architectureType !== null &&
  !APP_ARCHITECT_TYPES.includes(normalized.architectureType)
) {
  return createError(
    "UNSUPPORTED_ARCHITECTURE",
    `Unsupported architecture type: ${normalized.architectureType}`
  );
}

try {
  const architecture = await architect({
    prompt: normalized.prompt,
    platform: normalized.platform,
    architectureType: normalized.architectureType,
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

  if (normalized.useIntelligence) {
    if (!intelligence) {
      results.intelligence = createError(
        "INTELLIGENCE_UNAVAILABLE",
        "XSUS App Intelligence is disabled."
      );
    } else {
      try {
        results.intelligence =
          await intelligence.processRequest({
            query: normalized.prompt,
            language: normalized.language,
            metadata: {
              sourceProduct: "xsus-app",
              projectId: normalized.projectId
            }
          });
      } catch {
        results.intelligence = createError(
          "INTELLIGENCE_FAILED",
          "XSUS App Intelligence could not process the request."
        );
      }
    }
  }

  if (normalized.retrieveKnowledge) {
    if (!intelligence) {
      results.knowledge = createError(
        "INTELLIGENCE_UNAVAILABLE",
        "Knowledge retrieval is unavailable."
      );
    } else {
      try {
        results.knowledge = intelligence.retrieveKnowledge(
          normalized.prompt,
          {
            language: normalized.language,
            limit: 5,
            includeRelated: true
          }
        );
      } catch {
        results.knowledge = createError(
          "KNOWLEDGE_RETRIEVAL_FAILED",
          "Knowledge retrieval could not be completed."
        );
      }
    }
  }

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
    .filter(([, result]) => {
      return !result || result.success !== true;
    })
    .map(([name]) => name);

  const response = {
    success: failedModules.length === 0,
    data: Object.freeze({
      projectId: normalized.projectId,
      architecture,
      modules: Object.freeze(results)
    }),
    metadata: Object.freeze({
      engine: config.name,
      version: config.version,
      platform: normalized.platform,
      architectureType:
        architecture.architecture?.type || null,
      executedModules: Object.keys(results),
      failedModules,
      intelligenceEnabled: intelligence !== null,
      engineStatus: "active"
    })
  };

  if (failedModules.length > 0) {
    response.error = {
      code: "MODULE_EXECUTION_FAILED",
      message: "One or more application modules failed.",
      details: {
        failedModules
      }
    };
  }

  return Object.freeze(response);

} catch {
  return createError(
    "APP_ENGINE_FAILURE",
    "Application processing failed. Please try again."
  );
}

}

function getStatus() {
return Object.freeze({
name: config.name,
version: config.version,
capabilities: APP_ENGINE_CAPABILITIES,
status: closed ? "closed" : "active",
intelligenceEnabled: intelligence !== null,
intelligence: !closed && intelligence
? intelligence.getStatus()
: null,
closeError: closeError
? closeError.message
: null
});
}

function close() {
if (closed) {
return;
}

closed = true;

if (intelligence) {
  try {
    intelligence.close();
  } catch (error) {
    closeError = error;
    throw error;
  }
}

}

return Object.freeze({
name: config.name,
version: config.version,
capabilities: APP_ENGINE_CAPABILITIES,
processRequest,
getStatus,
close
});
}
