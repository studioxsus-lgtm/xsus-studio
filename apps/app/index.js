/**
 * XSUS Studio — XSUS App
 * Public Entry Point
 * Version: 1.0.1
 */

import {
  createAppEngine,
  XSUS_APP_ENGINE_VERSION,
  APP_ENGINE_CAPABILITIES
} from "./engine/app-engine.js";

import {
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
  createAppEngine,
  XSUS_APP_ENGINE_VERSION,
  APP_ENGINE_CAPABILITIES,
  XSUS_APP_CONTRACT_VERSION,
  APP_REQUEST_TYPES,
  APP_PLATFORMS,
  APP_ERROR_CODES,
  createAppRequest,
  createAppResponse,
  isAppRequest,
  isAppResponse
};

export const XSUS_APP_VERSION = "1.0.1";

export const XSUS_APP_PRODUCT = Object.freeze({
  id: "xsus-app",
  name: "XSUS App",
  version: XSUS_APP_VERSION,
  engineVersion: XSUS_APP_ENGINE_VERSION,
  contractVersion: XSUS_APP_CONTRACT_VERSION,
  description:
    "Platformë e pavarur për projektimin, krijimin, testimin dhe eksportimin e aplikacioneve.",
  capabilities: APP_ENGINE_CAPABILITIES,
  requestTypes: APP_REQUEST_TYPES,
  supportedPlatforms: APP_PLATFORMS
});
