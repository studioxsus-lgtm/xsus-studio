/**
 * XSUS App — Debugging Engine
 * Version: 1.0.0
 *
 * Independent code analysis and debugging module.
 * Uses an injected provider without direct dependency on XSUS AI Core.
 */

export const APP_DEBUGGING_ENGINE_VERSION = "1.0.0";

export const APP_DEBUGGING_CAPABILITIES = Object.freeze([
  "static-code-analysis",
  "error-detection",
  "bug-diagnosis",
  "security-analysis",
  "code-correction",
  "debugging-reports"
]);

export const APP_DEBUGGING_SEVERITIES = Object.freeze([
  "critical",
  "high",
  "medium",
  "low",
  "info"
]);

const DEFAULT_CONFIG = Object.freeze({
  maxCodeLength: 50000,
  maxIssues: 500
});

function createError(code, message) {
  return {
    success: false,
    error: { code, message }
  };
}

function normalizeRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return null;
  }

  const code = typeof request.code === "string"
    ? request.code
    : "";

  if (!code.trim()) return null;

  return {
    code,
    language: request.language || "javascript",
    fileName: request.fileName || "source-file",
    analysisType: request.analysisType || "full",
    includeSuggestions: request.includeSuggestions !== false
  };
}

function validateRequest(request, config) {
  if (!request) {
    return createError(
      "INVALID_REQUEST",
      "A valid debugging request is required."
    );
  }

  if (request.code.length > config.maxCodeLength) {
    return createError(
      "CODE_TOO_LONG",
      "The source code exceeds the allowed length."
    );
  }

  if (!["full", "errors", "security", "performance"].includes(
    request.analysisType
  )) {
    return createError(
      "INVALID_ANALYSIS_TYPE",
      "Unsupported debugging analysis type."
    );
  }

  return null;
}

function validateIssues(issues, maxIssues) {
  if (!Array.isArray(issues)) {
    return createError(
      "INVALID_ISSUES",
      "The provider must return an issues array."
    );
  }

  if (issues.length > maxIssues) {
    return createError(
      "ISSUE_LIMIT_EXCEEDED",
      "The debugging report exceeds the maximum issue count."
    );
  }

  const normalized = [];

  for (const issue of issues) {
    if (
      !issue ||
      typeof issue.message !== "string" ||
      !issue.message.trim() ||
      !APP_DEBUGGING_SEVERITIES.includes(issue.severity)
    ) {
      return createError(
        "INVALID_ISSUE",
        "Every issue must contain a message and valid severity."
      );
    }

    normalized.push(
      Object.freeze({
        message: issue.message,
        severity: issue.severity,
        code: typeof issue.code === "string" ? issue.code : null,
        line: Number.isInteger(issue.line) && issue.line > 0
          ? issue.line
          : null,
        suggestion: typeof issue.suggestion === "string"
          ? issue.suggestion
          : null
      })
    );
  }

  return {
    success: true,
    issues: Object.freeze(normalized)
  };
}

export function createDebuggingEngine(options = {}) {
  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...options.config
  });

  const provider = options.provider || null;

  async function analyze(request) {
    const normalized = normalizeRequest(request);
    const validationError = validateRequest(normalized, config);

    if (validationError) return validationError;

    if (!provider || typeof provider.analyze !== "function") {
      return createError(
        "DEBUGGING_PROVIDER_UNAVAILABLE",
        "No debugging analysis provider has been configured."
      );
    }

    try {
      const result = await provider.analyze({
        code: normalized.code,
        language: normalized.language,
        fileName: normalized.fileName,
        analysisType: normalized.analysisType,
        includeSuggestions: normalized.includeSuggestions
      });

      if (!result || typeof result !== "object") {
        return createError(
          "INVALID_PROVIDER_RESPONSE",
          "The debugging provider returned an invalid response."
        );
      }

      const validation = validateIssues(
        result.issues,
        config.maxIssues
      );

      if (!validation.success) return validation;

      return Object.freeze({
        success: true,
        data: Object.freeze({
          fileName: normalized.fileName,
          language: normalized.language,
          issues: validation.issues,
          summary: typeof result.summary === "string"
            ? result.summary
            : "",
          correctedCode: typeof result.correctedCode === "string"
            ? result.correctedCode
            : null
        }),
        metadata: Object.freeze({
          engineVersion: APP_DEBUGGING_ENGINE_VERSION,
          issueCount: validation.issues.length,
          analyzed: true
        })
      });
    } catch {
      return createError(
        "DEBUGGING_FAILED",
        "Code analysis failed. Please try again."
      );
    }
  }

  return Object.freeze({
    name: "XSUS App Debugging Engine",
    version: APP_DEBUGGING_ENGINE_VERSION,
    capabilities: APP_DEBUGGING_CAPABILITIES,
    analyze
  });
}
