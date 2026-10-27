
/**
 * XSUS AI Core — Response Quality Pipeline
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Normalizimi i hyrjes.
 * - Vlerësimi i cilësisë së përgjigjes.
 * - Verifikimi strukturor i burimeve.
 * - Krijimi i raportit përfundimtar.
 * - Standardizimi dhe izolimi i gabimeve.
 *
 * API publike ruhet:
 * createResponseQualityPipeline().evaluate(input)
 */

import {
  evaluateResponseQuality
} from "./response-quality-engine.js";

import {
  verifyResponseSources
} from "./response-source-verifier.js";

import {
  createResponseQualityReport
} from "./response-quality-report.js";

export const RESPONSE_QUALITY_PIPELINE_VERSION = "1.0.0";

function normalizeSources(sources) {
  return Array.isArray(sources) ? sources : [];
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createPipelineError(code, message) {
  return Object.freeze({
    code,
    message
  });
}

function createPipelineResult({
  quality = null,
  sourceVerification = null,
  report = null,
  errors = []
} = {}) {
  return Object.freeze({
    version: RESPONSE_QUALITY_PIPELINE_VERSION,
    quality,
    sourceVerification,
    report,
    errors: Object.freeze([...errors])
  });
}

function createInvalidInputResult() {
  return createPipelineResult({
    errors: [
      createPipelineError(
        "INVALID_INPUT",
        "Hyrja duhet të jetë objekt."
      )
    ]
  });
}

export function createResponseQualityPipeline() {
  function evaluate(input = {}) {
    if (
      input === null ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      return createInvalidInputResult();
    }

    const errors = [];

    const query = normalizeString(input.query);
    const answer = normalizeString(input.answer);

    const expectedLanguage = normalizeString(
      input.expectedLanguage ??
      input.requestedLanguage
    );

    const responseLanguage = normalizeString(
      input.responseLanguage ??
      expectedLanguage
    );

    const sources = normalizeSources(input.sources);

    if (!answer) {
      errors.push(
        createPipelineError(
          "EMPTY_ANSWER",
          "Përgjigjja është bosh."
        )
      );
    }

    let quality = null;
    let sourceVerification = null;
    let report = null;

    // Hapi 1: vlerësimi i cilësisë.
    try {
      quality = evaluateResponseQuality({
        query,
        answer,
        requestedLanguage: expectedLanguage,
        responseLanguage,
        sources
      });
    } catch {
      errors.push(
        createPipelineError(
          "QUALITY_EVALUATION_FAILED",
          "Vlerësimi i cilësisë dështoi."
        )
      );
    }

    // Hapi 2: verifikimi i burimeve.
    // Ky hap ekzekutohet edhe nëse vlerësimi i cilësisë dështon.
    try {
      sourceVerification = verifyResponseSources(sources);
    } catch {
      errors.push(
        createPipelineError(
          "SOURCE_VERIFICATION_FAILED",
          "Verifikimi i burimeve dështoi."
        )
      );
    }

    // Hapi 3: krijimi i raportit.
    // Raporti krijohet vetëm nëse vlerësimi prodhoi rezultat.
    if (quality !== null) {
      try {
        report = createResponseQualityReport(
          quality,
          sourceVerification
        );
      } catch {
        errors.push(
          createPipelineError(
            "REPORT_CREATION_FAILED",
            "Krijimi i raportit dështoi."
          )
        );
      }
    }

    return createPipelineResult({
      quality,
      sourceVerification,
      report,
      errors
    });
  }

  return Object.freeze({
    evaluate
  });
}
