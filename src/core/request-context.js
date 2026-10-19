
const DEFAULT_LANGUAGE = 'auto';

export function createRequestContext(request = {}) {
  const query =
    typeof request.query === 'string'
      ? request.query.trim()
      : '';

  const language =
    typeof request.language === 'string'
      ? request.language.trim().toLowerCase()
      : DEFAULT_LANGUAGE;

  return Object.freeze({
    requestId:
      request.id || `xsus-${Date.now()}`,
    query,
    language: language || DEFAULT_LANGUAGE,
    moduleName:
      typeof request.moduleName === 'string'
        ? request.moduleName.trim() || 'xsus-ai'
        : 'xsus-ai',
    metadata:
      request.metadata &&
      typeof request.metadata === 'object' &&
      !Array.isArray(request.metadata)
        ? { ...request.metadata }
        : {},
    createdAt: new Date().toISOString()
  });
}

export function isValidRequestContext(context) {
  return Boolean(
    context &&
    typeof context === 'object' &&
    typeof context.requestId === 'string' &&
    context.requestId.length > 0 &&
    typeof context.query === 'string' &&
    context.query.length > 0 &&
    typeof context.language === 'string'
  );
}
