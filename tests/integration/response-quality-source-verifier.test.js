import { describe, expect, test } from "vitest";

import {
  createResponseQualityPipeline
} from "../../src/core/response-quality-pipeline.js";

describe("XSUS AI Core — Response Quality Source Verifier", () => {
  function createInput(overrides = {}) {
    return {
      query: "Çfarë është inteligjenca artificiale?",
      answer: "Inteligjenca artificiale është një fushë e shkencës kompjuterike.",
      expectedLanguage: "sq",
      responseLanguage: "sq",
      sources: [],
      ...overrides
    };
  }

  test("vazhdon kur burimet mungojnë", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate(
      createInput({ sources: undefined })
    );

    expect(result.version).toBe("1.0.0");
    expect(result.sourceVerification).not.toBeNull();
    expect(result.sourceVerification.total).toBe(0);
    expect(result.sourceVerification.verifiedCount).toBe(0);
    expect(result.sourceVerification.trustEstablishedCount).toBe(0);
  });

  test("raporton burimet e pavlefshme pa rrëzuar pipeline-in", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate(
      createInput({
        sources: [
          {
            title: "",
            content: "Përmbajtje testuese",
            url: "https://example.com/article"
          },
          null
        ]
      })
    );

    expect(result.sourceVerification).not.toBeNull();
    expect(result.sourceVerification.total).toBe(2);
    expect(result.sourceVerification.invalidCount).toBe(2);
    expect(result.sourceVerification.verifiedCount).toBe(0);
    expect(result.sourceVerification.trustEstablishedCount).toBe(0);
  });

  test("nuk i paraqet burimet strukturalisht të vlefshme si faktikisht të verifikuara", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate(
      createInput({
        sources: [
          {
            title: "Burim testues",
            content: "Përmbajtje testuese",
            url: "https://example.com/article"
          }
        ]
      })
    );

    expect(result.sourceVerification.total).toBe(1);
    expect(result.sourceVerification.structurallyValidCount).toBe(1);
    expect(result.sourceVerification.verifiedCount).toBe(0);
    expect(result.sourceVerification.trustEstablishedCount).toBe(0);
  });
});
