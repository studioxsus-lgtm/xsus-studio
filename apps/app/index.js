/**

* XSUS App — Public Entry Point
* Version: 1.2.0
* 
* Public API for the independent XSUS App Engine.
  */

export {
createAppEngine,
XSUS_APP_ENGINE_VERSION,
APP_ENGINE_CAPABILITIES
} from "./engine/app-engine.js";

// Contracts
export {
XSUS_APP_CONTRACT_VERSION,
APP_REQUEST_TYPES,
APP_PLATFORMS,
APP_ERROR_CODES,
createAppRequest,
createAppResponse,
isAppRequest,
isAppResponse
} from "./contracts/app-contracts.js";

// Architecture
export {
APP_ARCHITECT_VERSION,
APP_ARCHITECT_TYPES,
APP_ARCHITECT_LAYERS,
createAppArchitecture,
getAppArchitectCapabilities
} from "./architect/app-architect.js";

// Code Generator
export {
APP_CODE_GENERATOR_VERSION,
APP_CODE_GENERATOR_CAPABILITIES,
APP_CODE_LANGUAGES,
createCodeGenerator
} from "./code-generator/code-generator.js";

// Frontend
export {
APP_FRONTEND_BUILDER_VERSION,
APP_FRONTEND_CAPABILITIES,
APP_FRONTEND_FRAMEWORKS,
createFrontendBuilder
} from "./frontend/frontend-builder.js";

// Backend
export {
APP_BACKEND_BUILDER_VERSION,
APP_BACKEND_CAPABILITIES,
APP_BACKEND_FRAMEWORKS,
createBackendBuilder
} from "./backend/backend-builder.js";

// Database
export {
APP_DATABASE_DESIGNER_VERSION,
APP_DATABASE_CAPABILITIES,
APP_DATABASE_ENGINES,
createDatabaseDesigner
} from "./database/database-designer.js";

// API
export {
APP_API_GENERATOR_VERSION,
APP_API_CAPABILITIES,
APP_API_HTTP_METHODS,
APP_API_STYLES,
createApiGenerator
} from "./api/api-generator.js";

// Debugging
export {
APP_DEBUGGING_ENGINE_VERSION,
APP_DEBUGGING_CAPABILITIES,
APP_DEBUGGING_SEVERITIES,
createDebuggingEngine
} from "./debugging/debugging-engine.js";

// Testing
export {
APP_TESTING_ENGINE_VERSION,
APP_TESTING_CAPABILITIES,
APP_TEST_TYPES,
createTestingEngine
} from "./testing/testing-engine.js";

// Export
export {
APP_EXPORTER_VERSION,
APP_EXPORT_CAPABILITIES,
APP_EXPORT_TARGETS,
APP_EXPORT_FORMATS,
createApplicationExporter
} from "./export/application-exporter.js";

// Workspace — Project Manager
export {
APP_PROJECT_MANAGER_VERSION,
APP_PROJECT_STATUSES,
APP_PROJECT_PLATFORMS,
createProject,
getProject,
listProjects,
updateProject,
deleteProject,
clearProjects,
getProjectManagerCapabilities
} from "./workspace/project-manager.js";

// Workspace — Project Files
export {
APP_PROJECT_FILES_VERSION,
APP_PROJECT_FILES_LIMITS,
createProjectFile,
getProjectFile,
listProjectFiles,
updateProjectFile,
deleteProjectFile,
deleteProjectFiles,
getProjectFilesCapabilities
} from "./workspace/project-files.js";

// Workspace — Project Builder
export {
APP_PROJECT_BUILDER_VERSION,
APP_BUILD_ERROR_CODES,
prepareProjectBuild,
getProjectBuilderCapabilities
} from "./workspace/project-builder.js";

// XSUS AI Core Adapter
export {
XSUS_AI_CORE_ADAPTER_VERSION,
XSUS_AI_CORE_ADAPTER_ERROR_CODES,
createXsusAICoreAdapter
} from "./adapters/xsus-ai-core-adapter.js";

// Hyper XSUS Core Adapter
export {
HYPER_XSUS_APP_ADAPTER_VERSION,
HYPER_XSUS_APP_ERROR_CODES,
createHyperXsusCoreAdapter,
getHyperXsusCoreAdapterCapabilities
} from "./adapters/hyper-xsus-core-adapter.js";

// App Intelligence Integration
export {
APP_INTELLIGENCE_VERSION,
createAppIntelligence
} from "./integration/app-intelligence.js";

// Product Definition
export const XSUS_APP_PRODUCT = Object.freeze({
id: "xsus-app",
name: "XSUS App",
version: "1.0.0",
description: "Independent application architecture and development platform.",
status: "development",
engine: "XSUS App Engine"
});
