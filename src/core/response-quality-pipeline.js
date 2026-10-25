/**
 * XSUS AI Core — Response Quality Pipeline
 * Version: 1.0.0
 *
 * Bashkon vlerësimin e cilësisë, verifikimin e burimeve
 * dhe krijimin e raportit përfundimtar.
 */

import { evaluateResponseQuality } from "./response-quality-engine.js";
import { verifyResponseSources } from "./response-source-verifier.js";
import { createResponseQualityReport } from "./response-quality-report.js";

export const RESPONSE_QUALITY_PIPELINE_VERSION = "1.0.0";

function normalizeSources(sources) {
  return Array.isArray(sources) ? sources : [];
}

function normalizeAnswer(answer) {
  return typeof answer === "string" ? answer : "";
}

function normalizeLanguage(language) {
  return typeof language === "string" ? language.trim() : "";
}

function createPipelineError(code, message) {
  return Object.freeze({ code, message });
}

export function createResponseQualityPipeline() {
  function evaluate(input = {}) {
    const errors = [];

    if (
      input === null ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      return {
        version: RESPONSE_QUALITY_PIPELINE_VERSION,
        quality: null,
        sourceVerification: null,
        report: null,
        errors: [
          createPipelineError(
            "INVALID_INPUT",
            "Hyrja duhet të jetë objekt."
          )
        ]
      };
    }

    const answer = normalizeAnswer(input.answer);
    const expectedLanguage = normalizeLanguage(
      input.expectedLanguage
    );
    const sources = normalizeSources(input.sources);

    if (!answer.trim()) {
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

    try {
      quality = evaluateResponseQuality({
        answer,
        expectedLanguage,
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

    return {
      version: RESPONSE_QUALITY_PIPELINE_VERSION,
      quality,
      sourceVerification,
      report,
      errors
    };
  }

  return Object.freeze({ evaluate });
}
