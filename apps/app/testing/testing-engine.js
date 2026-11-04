/**
 * XSUS App — Testing Engine
 * Version: 1.0.0
 *
 * Independent test planning and execution module.
 * Uses an injected provider without direct dependency on XSUS AI Core.
 */

export const APP_TESTING_ENGINE_VERSION = "1.0.0";

export const APP_TESTING_CAPABILITIES = Object.freeze([
  "test-planning",
  "unit-test-generation",
  "integration-test-generation",
  "end-to-end-test-planning",
  "test-execution",
  "test-reporting"
]);

export const APP_TEST_TYPES = Object.freeze([
  "unit",
  "integration",
  "e2e",
  "performance",
  "security"
]);

const DEFAULT_CONFIG = Object.freeze({
  maxPromptLength: 12000,
  maxTests: 1000
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

  const prompt = typeof request.prompt === "string"
    ? request.prompt.trim()
    : "";

  if (!prompt) return null;

  return {
    prompt,
    type: request.type || "unit",
    framework: request.framework || null,
    sourceCode: typeof request.sourceCode === "string"
      ? request.sourceCode
      : null,
    execute: request.execute === true,
    requirements: Array.isArray(request.requirements)
      ? [...request.requirements]
      : []
  };
}

function validateRequest(request, config) {
  if (!request) {
    return createError(
      "INVALID_REQUEST",
      "A valid testing request is required."
    );
  }

  if (request.prompt.length > config.maxPromptLength) {
    return createError(
      "PROMPT_TOO_LONG",
      "The testing prompt exceeds the allowed length."
    );
  }

  if (!APP_TEST_TYPES.includes(request.type)) {
    return createError(
      "UNSUPPORTED_TEST_TYPE",
      `Unsupported test type: ${request.type}`
    );
  }

  return null;
}

function validateTestCases(testCases, maxTests) {
  if (!Array.isArray(testCases)) {
    return createError(
      "INVALID_TEST_CASES",
      "The provider must return a testCases array."
    );
  }

  if (testCases.length > maxTests) {
    return createError(
      "TEST_LIMIT_EXCEEDED",
      "The test plan exceeds the maximum test count."
    );
  }

  const normalized = [];

  for (const test of testCases) {
    if (
      !test ||
      typeof test.name !== "string" ||
      !test.name.trim()
    ) {
      return createError(
        "INVALID_TEST_CASE",
        "Every test case must contain a name."
      );
    }

    normalized.push(
      Object.freeze({
        name: test.name,
        description: typeof test.description === "string"
          ? test.description
          : "",
        status: ["passed", "failed", "skipped", "pending"].includes(
          test.status
        )
          ? test.status
          : "pending",
        durationMs: Number.isFinite(test.durationMs) &&
          test.durationMs >= 0
          ? test.durationMs
          : null,
        error: typeof test.error === "string"
          ? test.error
          : null
      })
    );
  }

  return {
    success: true,
    testCases: Object.freeze(normalized)
  };
}

export function createTestingEngine(options = {}) {
  const config = Object.freeze({
    ...DEFAULT_CONFIG,
    ...options.config
  });

  const provider = options.provider || null;

  async function run(request) {
    const normalized = normalizeRequest(request);
    const validationError = validateRequest(normalized, config);

    if (validationError) return validationError;

    if (!provider || typeof provider.run !== "function") {
      return createError(
        "TESTING_PROVIDER_UNAVAILABLE",
        "No testing provider has been configured."
      );
    }

    try {
      const result = await provider.run({
        prompt: normalized.prompt,
        type: normalized.type,
        framework: normalized.framework,
        sourceCode: normalized.sourceCode,
        execute: normalized.execute,
        requirements: normalized.requirements
      });

      if (!result || typeof result !== "object") {
        return createError(
          "INVALID_PROVIDER_RESPONSE",
          "The testing provider returned an invalid response."
        );
      }

      const validation = validateTestCases(
        result.testCases,
        config.maxTests
      );

      if (!validation.success) return validation;

      const summary = validation.testCases.reduce(
        (totals, test) => {
          totals[test.status] += 1;
          return totals;
        },
        { passed: 0, failed: 0, skipped: 0, pending: 0 }
      );

      return Object.freeze({
        success: true,
        data: Object.freeze({
          type: normalized.type,
          framework: normalized.framework,
          testCases: validation.testCases,
          summary: Object.freeze(summary),
          report: typeof result.report === "string"
            ? result.report
            : ""
        }),
        metadata: Object.freeze({
          engineVersion: APP_TESTING_ENGINE_VERSION,
          testCount: validation.testCases.length,
          executed: normalized.execute === true &&
            result.executed === true
        })
      });
    } catch {
      return createError(
        "TESTING_FAILED",
        "Test processing failed. Please try again."
      );
    }
  }

  return Object.freeze({
    name: "XSUS App Testing Engine",
    version: APP_TESTING_ENGINE_VERSION,
    capabilities: APP_TESTING_CAPABILITIES,
    run
  });
}
