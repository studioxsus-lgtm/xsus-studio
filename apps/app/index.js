/**
 * XSUS Studio — XSUS App
 * Public Entry Point
 * Version: 1.0.0
 *
 * Eksporton ndërfaqen publike të produktit XSUS App.
 */

import {
  createAppEngine,
  XSUS_APP_ENGINE_VERSION,
  APP_ENGINE_CAPABILITIES
} from "./engine/app-engine.js";

export {
  createAppEngine,
  XSUS_APP_ENGINE_VERSION,
  APP_ENGINE_CAPABILITIES
};

export const XSUS_APP_VERSION = "1.0.0";

export const XSUS_APP_PRODUCT = Object.freeze({
  id: "xsus-app",
  name: "XSUS App",
  version: XSUS_APP_VERSION,
  engineVersion: XSUS_APP_ENGINE_VERSION,
  description:
    "Platformë për projektimin, krijimin dhe eksportimin e aplikacioneve.",
  capabilities: APP_ENGINE_CAPABILITIES
});
