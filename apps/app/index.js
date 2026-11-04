/**
 * XSUS App — Public Entry Point
 * Version: 1.1.0
 */

export {
  createAppEngine,
  XSUS_APP_ENGINE_VERSION,
  APP_ENGINE_CAPABILITIES
} from "./engine/app-engine.js";

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

export {
  APP_ARCHITECT_VERSION,
  APP_ARCHITECT_TYPES,
  APP_ARCHITECT_LAYERS,
  createAppArchitecture,
  getAppArchitectCapabilities
} from "./architect/app-architect.js";

export {
  APP_CODE_GENERATOR_VERSION,
  APP_CODE_GENERATOR_CAPABILITIES,
  APP_CODE_LANGUAGES,
  createCodeGenerator
} from "./code-generator/code-generator.js";

export {
  APP_FRONTEND_BUILDER_VERSION,
  APP_FRONTEND_CAPABILITIES,
  APP_FRONTEND_FRAMEWORKS,
  createFrontendBuilder
} from "./frontend/frontend-builder.js";

export {
  APP_BACKEND_BUILDER_VERSION,
  APP_BACKEND_CAPABILITIES,
  APP_BACKEND_FRAMEWORKS,
  createBackendBuilder
} from "./backend/backend-builder.js";

export {
  APP_DATABASE_DESIGNER_VERSION,
  APP_DATABASE_CAPABILITIES,
  APP_DATABASE_ENGINES,
  createDatabaseDesigner
} from "./database/database-designer.js";

export {
  APP_API_GENERATOR_VERSION,
  APP_API_CAPABILITIES,
  APP_API_HTTP_METHODS,
  APP_API_STYLES,
  createApiGenerator
} from "./api/api-generator.js";

export {
  APP_DEBUGGING_ENGINE_VERSION,
  APP_DEBUGGING_CAPABILITIES,
  APP_DEBUGGING_SEVERITIES,
  createDebuggingEngine
} from "./debugging/debugging-engine.js";

export {
  APP_TESTING_ENGINE_VERSION,
  APP_TESTING_CAPABILITIES,
  APP_TEST_TYPES,
  createTestingEngine
} from "./testing/testing-engine.js";

export {
  APP_EXPORTER_VERSION,
  APP_EXPORT_CAPABILITIES,
  APP_EXPORT_TARGETS,
  APP_EXPORT_FORMATS,
  createApplicationExporter
} from "./export/application-exporter.js";

export const XSUS_APP_PRODUCT = Object.freeze({
  id: "xsus-app",
  name: "XSUS App",
  version: "1.0.0",
  description: "Independent application architecture and development platform.",
  status: "development",
  engine: "XSUS App Engine"
});
