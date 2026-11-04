/**

* XSUS App — Intelligence Integration
* Version: 1.1.0
* 
* Koordinon:
* - XSUS AI Core
* - Hyper XSUS Core
* 
* Hyper XSUS Core konfigurohet si burim kryesor
* i njohurive për XSUS AI Core.
  */

import {
configureAICoreKnowledgeAdapter,
} from "../../../src/core/ai-core.js";

import {
createXsusAICoreAdapter,
} from "../adapters/xsus-ai-core-adapter.js";

import {
createHyperXsusCoreAdapter,
} from "../adapters/hyper-xsus-core-adapter.js";

export const APP_INTELLIGENCE_VERSION = "1.1.0";

export function createAppIntelligence(options = {}) {
const aiCore = createXsusAICoreAdapter(
options.aiCore || {}
);

let hyperCore;
let closed = false;
let knowledgeConfigured = false;

try {
hyperCore = createHyperXsusCoreAdapter(
options.hyperCore || {}
);

configureAICoreKnowledgeAdapter(hyperCore);
knowledgeConfigured = true;

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
throw new Error(
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
  knowledgeIntegration: knowledgeConfigured,
});

}

function close() {
if (closed) {
return;
}

let firstError = null;

// Hiq lidhjen globale vetëm kur kjo instancë
// është përgjegjëse për konfigurimin e saj.
if (knowledgeConfigured) {
  try {
    configureAICoreKnowledgeAdapter(null);
  } catch (error) {
    firstError = error;
  }
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
close,
});
}
