
export const XSUS_CORE_VERSION = '1.0.0';

export const SUPPORTED_LANGUAGES = Object.freeze([
  'sq',
  'en',
  'fr'
]);

export const REQUEST_TYPES = Object.freeze({
  CHAT: 'chat',
  KNOWLEDGE: 'knowledge',
  TOOL: 'tool',
  SYSTEM: 'system'
});

export function createAIRequest({
  id = null,
  query,
  language = 'auto',
  type = REQUEST_TYPES.CHAT,
  context = {},
  metadata = {}
} = {}) {
  if (typeof query !== 'string' || !query.trim()) {
    throw new TypeError('Query duhet të jetë tekst jo bosh.');
  }

  if (
    typeof language !== 'string' ||
    !/^(auto|[a-z]{2,3}(?:-[A-Z]{2})?)$/.test(language)
  ) {
    throw new TypeError('Gjuha nuk është e vlefshme.');
  }

  if (!Object.values(REQUEST_TYPES).includes(type)) {
    throw new TypeError('Lloji i kërkesës nuk njihet.');
  }

  return {
    id: id || createRequestId(),
    query: query.trim(),
    language,
    type,
    context: isPlainObject(context) ? context : {},
    metadata: isPlainObject(metadata) ? metadata : {},
    timestamp: new Date().toISOString(),
    version: XSUS_CORE_VERSION
  };
}

export function createAIResponse({
  requestId = null,
  answer,
  language = 'auto',
  source = 'xsus-core',
  confidence = null,
  metadata = {}
} = {}) {
  if (typeof answer !== 'string' || !answer.trim()) {
    throw new TypeError('Answer duhet të jetë tekst jo bosh.');
  }

  if (
    confidence !== null &&
    (
      typeof confidence !== 'number' ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1
    )
  ) {
    throw new TypeError('Confidence duhet të jetë nga 0 deri në 1.');
  }

  return {
    requestId,
    answer: answer.trim(),
    language,
    source,
    confidence,
    metadata: isPlainObject(metadata) ? metadata : {},
    timestamp: new Date().toISOString(),
    version: XSUS_CORE_VERSION
  };
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function createRequestId() {
  if (
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `xsus-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
