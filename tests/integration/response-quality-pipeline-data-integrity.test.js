import { describe, expect, test } from "vitest";

import {
  createResponseQualityPipeline
} from "../../src/core/response-quality-pipeline.js";

describe("XSUS AI Core — Response Quality Pipeline Data Integrity", () => {
  test("nuk ndryshon objektin origjinal të hyrjes", () => {
    const pipeline = createResponseQualityPipeline();

    const input = {
      query: "  Çfarë është uji?  ",
      answer: "  Uji është një përbërje kimike.  ",
      expectedLanguage: "sq",
      responseLanguage: "sq",
      sources: [
        {
          title: "Burim prove",
          content: "Përmbajtje prove."
        }
      ]
    };

    const originalInput = structuredClone(input);

    pipeline.evaluate(input);

    expect(input).toEqual(originalInput);
  });

  test("nuk ndan listën e gabimeve ndërmjet rezultateve", () => {
    const pipeline = createResponseQualityPipeline();

    const invalidResult = pipeline.evaluate(null);

    const validResult = pipeline.evaluate({
      answer: "Kjo është një përgjigje për testimin e integritetit.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(invalidResult.errors).not.toBe(validResult.errors);

    expect(invalidResult.errors).toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );

    expect(validResult.errors).not.toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  test("nuk ndan koleksionin e burimeve ndërmjet kërkesave", () => {
    const pipeline = createResponseQualityPipeline();

    const first = pipeline.evaluate({
      answer: "Përgjigjja e parë për testim.",
      expectedLanguage: "sq",
      sources: [
        {
          title: "Burimi A",
          content: "Përmbajtja A."
        }
      ]
    });

    const second = pipeline.evaluate({
      answer: "Përgjigjja e dytë për testim.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(first.sourceVerification.results).toHaveLength(1);
    expect(second.sourceVerification.results).toHaveLength(0);

    expect(first.sourceVerification.results).not.toBe(
      second.sourceVerification.results
    );
  });

  test("ruan strukturën e rezultatit kur hyrja është e pavlefshme", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate(null);

    expect(Object.keys(result).sort()).toEqual([
      "errors",
      "quality",
      "report",
      "sourceVerification",
      "version"
    ]);

    expect(result.version).toBe("1.0.0");
    expect(result.quality).toBeNull();
    expect(result.sourceVerification).toBeNull();
    expect(result.report).toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });

  test("ruan izolimin pas një kërkese me përgjigje bosh", () => {
    const pipeline = createResponseQualityPipeline();

    const emptyResult = pipeline.evaluate({
      answer: "   ",
      expectedLanguage: "sq",
      sources: []
    });

    const validResult = pipeline.evaluate({
      answer: "Kjo është një përgjigje e vlefshme për testim.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(emptyResult.errors).toContainEqual(
      expect.objectContaining({
        code: "EMPTY_ANSWER"
      })
    );

    expect(validResult.errors).not.toContainEqual(
      expect.objectContaining({
        code: "EMPTY_ANSWER"
      })
    );

    expect(validResult.version).toBe("1.0.0");
    expect(validResult.quality).not.toBeNull();
    expect(validResult.report).not.toBeNull();
  });
});
