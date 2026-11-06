
/**
 * XSUS Studio — XSUS App Bridge
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Lidh XSUS Studio me XSUS App.
 * - Përdor vetëm hyrjen publike të XSUS App.
 * - Menaxhon një instancë të vetme App Engine.
 * - Ekspozon API të kontrolluar për frontend-in.
 * - Menaxhon statusin dhe ciklin e jetës.
 *
 * Arkitektura:
 *
 * XSUS STUDIO
 *      |
 *      v
 * XSUS APP BRIDGE
 *      |
 *      v
 * apps/app/index.js
 *      |
 *      v
 * XSUS APP ENGINE
 *
 * Nuk krijon lidhje direkte me Core-t.
 * Nuk përdor services/ të main.
 */

import {
  createAppEngine
} from "../../apps/app/index.js";

export const XSUS_APP_BRIDGE_VERSION = "1.0.0";

export const XSUS_APP_BRIDGE_ERROR_CODES =
  Object.freeze({
    ENGINE_INITIALIZATION_FAILED:
      "ENGINE_INITIALIZATION_FAILED",

    ENGINE_UNAVAILABLE:
      "ENGINE_UNAVAILABLE",

    INVALID_REQUEST:
      "INVALID_REQUEST",

    ENGINE_CLOSED:
      "ENGINE_CLOSED"
  });

let appEngine = null;
let initializationError = null;

function createBridgeError(code, message, cause = null) {
  const error = new Error(message);

  error.code = code;

  if (cause) {
    error.cause = cause;
  }

  return error;
}

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

/**
 * Initializes XSUS App Engine once.
 */
function getEngine() {
  if (appEngine !== null) {
    return appEngine;
  }

  try {
    appEngine = createAppEngine();

    initializationError = null;

    return appEngine;
  } catch (error) {
    initializationError = error;

    throw createBridgeError(
      XSUS_APP_BRIDGE_ERROR_CODES
        .ENGINE_INITIALIZATION_FAILED,
      "XSUS App Engine could not be initialized.",
      error
    );
  }
}

/**
 * Processes a request through XSUS App.
 */
export async function processXsusAppRequest(request) {
  if (!isPlainObject(request)) {
    throw createBridgeError(
      XSUS_APP_BRIDGE_ERROR_CODES.INVALID_REQUEST,
      "XSUS App request must be a plain object."
    );
  }

  const engine = getEngine();

  try {
    return await engine.processRequest(request);
  } catch (error) {
    throw error;
  }
}

/**
 * Returns XSUS App integration status.
 */
export function getXsusAppBridgeStatus() {
  if (appEngine === null) {
    return Object.freeze({
      bridge: "xsus-app-bridge",
      bridgeVersion: XSUS_APP_BRIDGE_VERSION,
      initialized: false,
      connected: false,
      initializationError:
        initializationError?.message || null
    });
  }

  try {
    return Object.freeze({
      bridge: "xsus-app-bridge",
      bridgeVersion: XSUS_APP_BRIDGE_VERSION,
      initialized: true,
      connected: true,
      app: appEngine.getStatus()
    });
  } catch (error) {
    return Object.freeze({
      bridge: "xsus-app-bridge",
      bridgeVersion: XSUS_APP_BRIDGE_VERSION,
      initialized: true,
      connected: false,
      error: error.message
    });
  }
}

/**
 * Closes the active XSUS App Engine.
 */
export function closeXsusAppBridge() {
  if (appEngine === null) {
    return;
  }

  const engine = appEngine;

  try {
    engine.close();

    appEngine = null;
    initializationError = null;
  } catch (error) {
    throw createBridgeError(
      XSUS_APP_BRIDGE_ERROR_CODES.ENGINE_CLOSED,
      "XSUS App Engine could not be closed cleanly.",
      error
    );
  }
}

/**
 * Public bridge API for XSUS Studio.
 */
export function getXsusAppBridge() {
  return Object.freeze({
    version: XSUS_APP_BRIDGE_VERSION,

    processRequest: processXsusAppRequest,

    getStatus: getXsusAppBridgeStatus,

    close: closeXsusAppBridge
  });
}
