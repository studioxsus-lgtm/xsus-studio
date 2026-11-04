/**

* XSUS App — Intelligence Integration
* Version: 1.2.0
* 
* Koordinon:
* - XSUS AI Core
* - Hyper XSUS Core
* 
* Hyper XSUS Core konfigurohet si burim kryesor
* i njohurive për XSUS AI Core.
* 
* Menaxhon pronësinë e konfigurimit global
* për të shmangur konfliktet ndërmjet instancave.
  */

import {
configureAICoreKnowledgeAdapter
} from "../../../src/core/ai-core.js";

import {
createXsusAICoreAdapter
} from "../adapters/xsus-ai-core-adapter.js";

import {
createHyperXsusCoreAdapter
} from "../adapters/hyper-xsus-core-adapter.js";

export const APP_INTELLIGENCE_VERSION = "1.2.0";

let activeKnowledgeOwner = null;

function createIntegrationError(code, message) {
const error = new Error(message);
error.code = code;
return error;
}

export function createAppIntelligence(options = {}) {
if (activeKnowledgeOwner !== null) {
throw createIntegrationError(
"APP_INTELLIGENCE_ALREADY_ACTIVE",
"Një instancë tjetër XSUS App Intelligence është aktive."
);
}

const owner = Object.freeze({});
const aiCore = createXsusAICoreAdapter(
options.aiCore || {}
);

let hyperCore = null;
let closed = false;
let knowledgeConfigured = false;

try {
hyperCore = createHyperXsusCoreAdapter(
options.hyperCore || {}
);

configureAICoreKnowledgeAdapter(hyperCore);

knowledgeConfigured = true;
activeKnowledgeOwner = owner;

} catch (error) {
if (hyperCore) {
try {
hyperCore.close();
} catch {
// Ruajmë gabimin fillestar.
}
}

throw error;

}

function assertOpen() {
if (closed) {
throw createIntegrationError(
"APP_INTELLIGENCE_CLOSED",
"XSUS App Intelligence is closed."
);
}
}

async function processRequest(input = {}) {
assertOpen();

return aiCore.processRequest(input);

}

function retrieveKnowledge(query, retrieveOptions = {}) {
assertOpen();

return hyperCore.retrieve(
  query,
  retrieveOptions
);

}

function getStatus() {
assertOpen();

return Object.freeze({
  version: APP_INTELLIGENCE_VERSION,
  connected: true,
  aiCore: aiCore.getCapabilities(),
  hyperCore: hyperCore.getStatus(),
  knowledgeIntegration: knowledgeConfigured
});

}

function close() {
if (closed) {
return;
}

let firstError = null;

// Vetëm pronari aktual mund ta heqë
// konfigurimin global të XSUS AI Core.
if (
  knowledgeConfigured &&
  activeKnowledgeOwner === owner
) {
  try {
    configureAICoreKnowledgeAdapter(null);
  } catch (error) {
    firstError = error;
  }

  activeKnowledgeOwner = null;
  knowledgeConfigured = false;
}

try {
  hyperCore.close();
} catch (error) {
  if (!firstError) {
    firstError = error;
  }
}

closed = true;

if (firstError) {
  throw firstError;
}

}

return Object.freeze({
processRequest,
retrieveKnowledge,
getStatus,
close
});
}
