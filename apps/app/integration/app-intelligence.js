/**

* XSUS App — Intelligence Integration
* Version: 1.0.0
* 
* Koordinon integrimin me:
* - XSUS AI Core
* - Hyper XSUS Core
* 
* Motorët mbeten të pavarur.
  */

import {
createXsusAICoreAdapter,
} from "../adapters/xsus-ai-core-adapter.js";

import {
createHyperXsusCoreAdapter,
} from "../adapters/hyper-xsus-core-adapter.js";

export const APP_INTELLIGENCE_VERSION = "1.0.0";

export function createAppIntelligence(options = {}) {
const aiCore = createXsusAICoreAdapter(
options.aiCore || {}
);

let hyperCore;

try {
hyperCore = createHyperXsusCoreAdapter(
options.hyperCore || {}
);
} catch (error) {
aiCore.close?.();
throw error;
}

let closed = false;

function assertOpen() {
if (closed) {
throw new Error(
"XSUS App Intelligence is closed."
);
}
}

async function processRequest(input = {}) {
assertOpen();

const aiResult = await aiCore.processRequest(input);

return Object.freeze({
  success: aiResult.success,
  answer: aiResult.answer,
  language: aiResult.language,
  source: aiResult.source,
  confidence: aiResult.confidence,
  version: APP_INTELLIGENCE_VERSION,
  metadata: Object.freeze({
    ...aiResult.metadata,
    intelligence: Object.freeze({
      aiCore: true,
      hyperCore: true,
    }),
  }),
});

}

function retrieveKnowledge(query, retrieveOptions = {}) {
assertOpen();
return hyperCore.retrieve(query, retrieveOptions);
}

function getStatus() {
assertOpen();

return Object.freeze({
  version: APP_INTELLIGENCE_VERSION,
  connected: true,
  aiCore: aiCore.getCapabilities(),
  hyperCore: hyperCore.getStatus(),
});

}

function close() {
if (closed) return;

let firstError = null;

try {
  hyperCore.close();
} catch (error) {
  firstError = error;
}

try {
  aiCore.close?.();
} catch (error) {
  if (!firstError) firstError = error;
}

closed = true;

if (firstError) throw firstError;

}

return Object.freeze({
processRequest,
retrieveKnowledge,
getStatus,
close,
});
}
