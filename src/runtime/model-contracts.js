/**
 * XSUS AI Core — Model Contracts
 * Version: 1.0.0
 *
 * Kontrata standarde për komunikimin me modelet AI.
 *
 * Përgjegjësitë:
 * - Standardizimi i kërkesave dhe përgjigjeve të modelit.
 * - Validimi i parametrave të gjenerimit.
 * - Standardizimi i gabimeve të modelit.
 * - Izolimi i objekteve hyrëse.
 * - Pavarësia nga ofruesit dhe implementimet konkrete.
 */

export const MODEL_CONTRACTS_VERSION = "1.0.0";

export const MODEL_ERROR_CODES = Object.freeze({
  INVALID_REQUEST: "MODEL_INVALID_REQUEST",
  INVALID_RESPONSE: "MODEL_INVALID_RESPONSE",
  NOT_INITIALIZED: "MODEL_NOT_INITIALIZED",
  UNAVAILABLE: "MODEL_UNAVAILABLE",
  TIMEOUT: "MODEL_TIMEOUT",
  ABORTED: "MODEL_ABORTED",
  INFERENCE_FAILED: "MODEL_INFERENCE_FAILED",
  INTERNAL_ERROR: "MODEL_INTERNAL_ERROR",
});

export const MODEL_RUNTIME_STATES = Object.freeze({
  IDLE: "idle",
  INITIALIZING: "initializing",
  READY: "ready",
  RUNNING: "running",
  ERROR: "error",
  CLOSED: "closed",
});

const DEFAULT_MAX_INPUT_LENGTH = 32000;
const DEFAULT_MAX_OUTPUT_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  try {
    const prototype = Object.getPrototypeOf(value);

    return (
      prototype === Object.prototype ||
      prototype === null
    );
  } catch {
    return false;
  }
}

function normalizeObject(value, errorMessage) {
  if (value === undefined || value === null) {
    return {};
  }

  if (!isPlainObject(value)) {
    throw new TypeError(errorMessage);
  }

  try {
    return { ...value };
  } catch {
    throw new TypeError(errorMessage);
  }
}

function normalizeText(value, fieldName, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(
      `${fieldName} duhet të jetë tekst jo bosh.`,
    );
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new RangeError(
      `${fieldName} tejkalon gjatësinë maksimale.`,
    );
  }

  return normalized;
}

function normalizeOptionalId(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(
      `${fieldName} nuk është i vlefshëm.`,
    );
  }

  return value.trim();
}

function normalizeTemperature(value) {
  if (value === undefined) {
    return DEFAULT_TEMPERATURE;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 2
  ) {
    throw new RangeError(
      "temperature duhet të jetë numër nga 0 deri në 2.",
    );
  }

  return value;
}

function normalizeMaxOutputTokens(value) {
  if (value === undefined) {
    return DEFAULT_MAX_OUTPUT_TOKENS;
  }

  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 32768
  ) {
    throw new RangeError(
      "maxOutputTokens duhet të jetë numër i plotë nga 1 deri në 32768.",
    );
  }

  return value;
}

function normalizeErrorCode(code) {
  return (
    typeof code === "string" &&
    Object.values(MODEL_ERROR_CODES).includes(code)
  )
    ? code
    : MODEL_ERROR_CODES.INTERNAL_ERROR;
}

/**
 * Krijon një kërkesë standarde për gjenerimin e modelit.
 *
 * modelId është opsional, që Runtime të mund të zgjedhë
 * modelin lokal të konfiguruar si parazgjedhje.
 */
export function createModelRequest(input = {}) {
  if (!isPlainObject(input)) {
    throw new TypeError(
      "Kërkesa e modelit duhet të jetë objekt i vlefshëm.",
    );
  }

  const {
    requestId = null,
    conversationId = null,
    prompt,
    systemPrompt = null,
    language = "auto",
    modelId = null,
    context = {},
    metadata = {},
    parameters = {},
  } = input;

  const normalizedPrompt = normalizeText(
    prompt,
    "prompt",
    DEFAULT_MAX_INPUT_LENGTH,
  );

  let normalizedSystemPrompt = null;

  if (systemPrompt !== null && systemPrompt !== undefined) {
    normalizedSystemPrompt = normalizeText(
      systemPrompt,
      "systemPrompt",
      DEFAULT_MAX_INPUT_LENGTH,
    );
  }

  const normalizedLanguage = normalizeText(
    language,
    "language",
    35,
  ).toLowerCase();

  const normalizedModelId = normalizeOptionalId(
    modelId,
    "modelId",
  );

  const normalizedRequestId = normalizeOptionalId(
    requestId,
    "requestId",
  );

  const normalizedConversationId = normalizeOptionalId(
    conversationId,
    "conversationId",
  );

  const normalizedContext = normalizeObject(
    context,
    "Konteksti i modelit nuk është i vlefshëm.",
  );

  const normalizedMetadata = normalizeObject(
    metadata,
    "Metadata e modelit nuk është e vlefshme.",
  );

  const normalizedParameters = normalizeObject(
    parameters,
    "Parametrat e modelit nuk janë të vlefshëm.",
  );

  const temperature = normalizeTemperature(
    normalizedParameters.temperature,
  );

  const maxOutputTokens = normalizeMaxOutputTokens(
    normalizedParameters.maxOutputTokens,
  );

  return {
    requestId: normalizedRequestId,
    conversationId: normalizedConversationId,
    prompt: normalizedPrompt,
    systemPrompt: normalizedSystemPrompt,
    language: normalizedLanguage,
    modelId: normalizedModelId,
    context: normalizedContext,
    metadata: normalizedMetadata,
    parameters: {
      ...normalizedParameters,
      temperature,
      maxOutputTokens,
    },
    timestamp: new Date().toISOString(),
    contractVersion: MODEL_CONTRACTS_VERSION,
  };
}

/**
 * Krijon një përgjigje standarde të modelit.
 */
export function createModelResponse(input = {}) {
  if (!isPlainObject(input)) {
    throw new TypeError(
      "Përgjigjja e modelit duhet të jetë objekt i vlefshëm.",
    );
  }

  const {
    requestId = null,
    conversationId = null,
    text,
    modelId,
    language = "auto",
    finishReason = "stop",
    usage = {},
    metadata = {},
  } = input;

  const normalizedText = normalizeText(
    text,
    "text",
    DEFAULT_MAX_INPUT_LENGTH * 4,
  );

  const normalizedModelId = normalizeText(
    modelId,
    "modelId",
    200,
  );

  const normalizedRequestId = normalizeOptionalId(
    requestId,
    "requestId",
  );

  const normalizedConversationId = normalizeOptionalId(
    conversationId,
    "conversationId",
  );

  const normalizedLanguage = normalizeText(
    language,
    "language",
    35,
  ).toLowerCase();

  if (
    typeof finishReason !== "string" ||
    !finishReason.trim()
  ) {
    throw new TypeError(
      "finishReason duhet të jetë tekst jo bosh.",
    );
  }

  const normalizedUsage = normalizeObject(
    usage,
    "usage nuk është i vlefshëm.",
  );

  for (const key of [
    "inputTokens",
    "outputTokens",
    "totalTokens",
  ]) {
    if (normalizedUsage[key] !== undefined) {
      if (
        !Number.isSafeInteger(normalizedUsage[key]) ||
        normalizedUsage[key] < 0
      ) {
        throw new RangeError(
          `${key} duhet të jetë numër i plotë jo negativ.`,
        );
      }
    }
  }

  const normalizedMetadata = normalizeObject(
    metadata,
    "Metadata e përgjigjes së modelit nuk është e vlefshme.",
  );

  return {
    success: true,
    requestId: normalizedRequestId,
    conversationId: normalizedConversationId,
    text: normalizedText,
    modelId: normalizedModelId,
    language: normalizedLanguage,
    finishReason: finishReason.trim(),
    usage: normalizedUsage,
    metadata: normalizedMetadata,
    timestamp: new Date().toISOString(),
    contractVersion: MODEL_CONTRACTS_VERSION,
  };
}

/**
 * Krijon një gabim të standardizuar të modelit.
 */
export function createModelError(input = {}) {
  if (!isPlainObject(input)) {
    throw new TypeError(
      "Gabimi i modelit duhet të jetë objekt i vlefshëm.",
    );
  }

  const {
    requestId = null,
    code = MODEL_ERROR_CODES.INTERNAL_ERROR,
    message = "Ndodhi një gabim gjatë ekzekutimit të modelit.",
    retryable = false,
    metadata = {},
  } = input;

  if (typeof retryable !== "boolean") {
    throw new TypeError(
      "retryable duhet të jetë vlerë boolean.",
    );
  }

  if (typeof message !== "string" || !message.trim()) {
    throw new TypeError(
      "Mesazhi i gabimit duhet të jetë tekst jo bosh.",
    );
  }

  const normalizedMetadata = normalizeObject(
    metadata,
    "Metadata e gabimit nuk është e vlefshme.",
  );

  return {
    success: false,
    requestId: normalizeOptionalId(
      requestId,
      "requestId",
    ),
    error: {
      code: normalizeErrorCode(code),
      message: message.trim(),
      retryable,
    },
    metadata: normalizedMetadata,
    timestamp: new Date().toISOString(),
    contractVersion: MODEL_CONTRACTS_VERSION,
  };
}
