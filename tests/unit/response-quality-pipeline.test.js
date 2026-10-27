
import { describe, expect, test } from "vitest";

import {
  createResponseQualityPipeline,
  RESPONSE_QUALITY_PIPELINE_VERSION
} from "../../src/core/response-quality-pipeline.js";

describe("XSUS AI Core — Response Quality Pipeline Unit", () => {
  test("eksporton versionin e pritshëm", () => {
    expect(RESPONSE_QUALITY_PIPELINE_VERSION).toBe("1.0.0");
  });

  test("krijon pipeline me metodën evaluate", () => {
    const pipeline = createResponseQualityPipeline();

    expect(typeof pipeline.evaluate).toBe("function");
    expect(Object.isFrozen(pipeline)).toBe(true);
  });

  test("kthen strukturën publike të pritshme", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Parisi është kryeqyteti i Francës.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(Object.keys(result).sort()).toEqual([
      "errors",
      "quality",
      "report",
      "sourceVerification",
      "version"
    ]);

    expect(result.version).toBe("1.0.0");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test("përpunon përgjigje të vlefshme pa gabim hyrjeje", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      query: "Çfarë është uji?",
      answer: "Uji është një përbërje kimike e hidrogjenit dhe oksigjenit.",
      expectedLanguage: "sq",
      responseLanguage: "sq",
      sources: []
    });

    expect(result.quality).not.toBeNull();
    expect(result.sourceVerification).not.toBeNull();
    expect(result.report).not.toBeNull();

    expect(result.errors).not.toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  test("kthen gabimin e standardizuar për null", () => {
    const pipeline = createResponseQualityPipeline();

    expect(pipeline.evaluate(null)).toEqual({
      version: "1.0.0",
      quality: null,
      sourceVerification: null,
      report: null,
      errors: [
        {
          code: "INVALID_INPUT",
          message: "Hyrja duhet të jetë objekt."
        }
      ]
    });
  });

  test.each([
    ["tekst", "tekst"],
    ["numër", 42],
    ["boolean", true],
    ["array", []]
  ])("refuzon hyrjen e tipit %s", (_label, input) => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate(input);

    expect(result.version).toBe("1.0.0");
    expect(result.quality).toBeNull();
    expect(result.sourceVerification).toBeNull();
    expect(result.report).toBeNull();

    expect(result.errors).toContainEqual({
      code: "INVALID_INPUT",
      message: "Hyrja duhet të jetë objekt."
    });
  });

  test("raporton përgjigjen bosh", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result.errors).toContainEqual({
      code: "EMPTY_ANSWER",
      message: "Përgjigjja është bosh."
    });
  });

  test("normalizon përgjigjen që përmban vetëm hapësira", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "   \n\t ",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result.errors).toContainEqual({
      code: "EMPTY_ANSWER",
      message: "Përgjigjja është bosh."
    });
  });

  test("përdor requestedLanguage kur expectedLanguage mungon", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Kjo është një përgjigje në shqip.",
      requestedLanguage: "sq",
      sources: []
    });

    expect(result.quality).not.toBeNull();
    expect(result.errors).not.toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  test("expectedLanguage ka përparësi ndaj requestedLanguage", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "This is a test answer with enough text.",
      expectedLanguage: "en",
      requestedLanguage: "sq",
      sources: []
    });

    expect(result.quality).not.toBeNull();
    expect(result.errors).not.toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  test("përdor expectedLanguage si responseLanguage kur mungon", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Kjo është një përgjigje për testimin e gjuhës.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result.quality).not.toBeNull();
    expect(result.report).not.toBeNull();
  });

  test("normalizon query dhe answer me hapësira anësore", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      query: "  Çfarë është uji?  ",
      answer: "  Uji është një përbërje kimike.  ",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result.quality).not.toBeNull();
    expect(result.errors).not.toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  test("normalizon sources jo-array në listë bosh", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Kjo është një përgjigje për testim.",
      expectedLanguage: "sq",
      sources: "burim i pavlefshëm"
    });

    expect(result.sourceVerification).not.toBeNull();
    expect(result.sourceVerification.results).toHaveLength(0);
    expect(result.errors).not.toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  test("ia përcjell burimet verifikuesit", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Kjo përgjigje ka dy burime për kontroll.",
      expectedLanguage: "sq",
      sources: [
        {
          title: "Burimi A",
          content: "Përmbajtje për burimin e parë."
        },
        {
          title: "Burimi B",
          content: "Përmbajtje për burimin e dytë."
        }
      ]
    });

    expect(result.sourceVerification).not.toBeNull();
    expect(result.sourceVerification.results).toHaveLength(2);
  });

  test("nuk pretendon verifikim të pavarur pa prova", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Një përgjigje provë për verifikimin e burimeve.",
      expectedLanguage: "sq",
      sources: [
        {
          title: "Burim prove",
          content: "Përmbajtje prove pa verifikim të pavarur."
        }
      ]
    });

    expect(result.sourceVerification).not.toBeNull();
    expect(result.sourceVerification.verifiedCount).toBe(0);
    expect(result.sourceVerification.trustEstablishedCount).toBe(0);
  });

  test("krijon raport kur vlerësimi i cilësisë përfundon", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Kjo është një përgjigje e plotë për testimin e raportit.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result.quality).not.toBeNull();
    expect(result.report).not.toBeNull();
    expect(result.report).toHaveProperty("dimensions");
    expect(result.report).toHaveProperty("recommendations");
  });

  test("nuk ndan gabimet ndërmjet thirrjeve", () => {
    const pipeline = createResponseQualityPipeline();

    const invalidResult = pipeline.evaluate(null);

    const validResult = pipeline.evaluate({
      answer: "Kjo është një përgjigje e vlefshme për testim.",
      expectedLanguage: "sq",
      sources: []
    });

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

  test("kthen rezultate të veçanta për thirrje të njëpasnjëshme", () => {
    const pipeline = createResponseQualityPipeline();

    const first = pipeline.evaluate({
      answer: "Përgjigjja e parë për testimin e pipeline-it.",
      expectedLanguage: "sq",
      sources: []
    });

    const second = pipeline.evaluate({
      answer: "The second answer is used to test the pipeline.",
      expectedLanguage: "en",
      sources: []
    });

    expect(first).not.toBe(second);
    expect(first.errors).not.toBe(second.errors);
    expect(first.version).toBe("1.0.0");
    expect(second.version).toBe("1.0.0");
  });

  test("nuk ndryshon versionin ndërmjet rezultateve", () => {
    const pipeline = createResponseQualityPipeline();

    const first = pipeline.evaluate({
      answer: "Përgjigjja e parë.",
      sources: []
    });

    const second = pipeline.evaluate({
      answer: "Përgjigjja e dytë.",
      sources: []
    });

    expect(first.version).toBe(RESPONSE_QUALITY_PIPELINE_VERSION);
    expect(second.version).toBe(RESPONSE_QUALITY_PIPELINE_VERSION);
  });
});
