
import { describe, expect, test } from "vitest";

import {
  createResponseQualityPipeline,
  RESPONSE_QUALITY_PIPELINE_VERSION
} from "../../src/core/response-quality-pipeline.js";

describe("XSUS AI Core — Response Quality Pipeline", () => {
  test("ka versionin e pritshëm", () => {
    expect(RESPONSE_QUALITY_PIPELINE_VERSION).toBe("1.0.0");
  });

  test("kthen rezultat të strukturuar për një përgjigje", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Parisi është kryeqyteti i Francës.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result).toHaveProperty("version", "1.0.0");
    expect(result).toHaveProperty("quality");
    expect(result).toHaveProperty("sourceVerification");
    expect(result).toHaveProperty("report");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test("ruan rezultatet e cilësisë dhe raportit", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Uji përbëhet nga hidrogjeni dhe oksigjeni.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result.quality).toBeDefined();
    expect(result.report).toBeDefined();
    expect(result.report).toHaveProperty("dimensions");
    expect(result.report).toHaveProperty("recommendations");
  });

  test("nuk pretendon se burimet janë verifikuar pa prova", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Një përgjigje provë.",
      expectedLanguage: "sq",
      sources: [
        {
          title: "Burim prove",
          content: "Përmbajtje prove pa verifikim të pavarur."
        }
      ]
    });

    expect(result.sourceVerification).toBeDefined();

    if (Array.isArray(result.sourceVerification.results)) {
      for (const source of result.sourceVerification.results) {
        expect(source.verified).not.toBe(true);
        expect(source.trustEstablished).not.toBe(true);
      }
    }
  });

  test("raporton gabim për përgjigjen bosh", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "",
      expectedLanguage: "sq",
      sources: []
    });

    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors).toContainEqual({
      code: "EMPTY_ANSWER",
      message: "Përgjigjja është bosh."
    });
  });

  test("refuzon hyrjen null me gabim të standardizuar", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate(null);

    expect(result).toEqual({
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

  test("refuzon vargun si hyrje të pavlefshme", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate([
      {
        answer: "Kjo nuk duhet të pranohet si objekt kërkese."
      }
    ]);

    expect(result.version).toBe("1.0.0");
    expect(result.quality).toBeNull();
    expect(result.sourceVerification).toBeNull();
    expect(result.report).toBeNull();
    expect(result.errors[0].code).toBe("INVALID_INPUT");
  });

  test("refuzon numrat dhe vlerat primitive si hyrje", () => {
    const pipeline = createResponseQualityPipeline();

    for (const input of [42, "tekst", true]) {
      const result = pipeline.evaluate(input);

      expect(result.errors).toContainEqual({
        code: "INVALID_INPUT",
        message: "Hyrja duhet të jetë objekt."
      });

      expect(result.quality).toBeNull();
      expect(result.sourceVerification).toBeNull();
      expect(result.report).toBeNull();
    }
  });

  test("pranon objekt bosh, por raporton përgjigjen e munguar", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({});

    expect(result.version).toBe("1.0.0");
    expect(result.errors).toContainEqual({
      code: "EMPTY_ANSWER",
      message: "Përgjigjja është bosh."
    });
  });

  test("e trajton përgjigjen me vetëm hapësira si përgjigje bosh", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "   \n\t  ",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result.errors).toContainEqual({
      code: "EMPTY_ANSWER",
      message: "Përgjigjja është bosh."
    });
  });

  test("pranon requestedLanguage kur expectedLanguage mungon", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      query: "Çfarë është uji?",
      answer: "Uji është një përbërje kimike.",
      requestedLanguage: "sq",
      sources: []
    });

    expect(result.version).toBe("1.0.0");
    expect(result.quality).not.toBeNull();
    expect(result.errors).not.toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  test("normalizon sources të pavlefshme pa e refuzuar kërkesën", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer: "Një përgjigje prove.",
      expectedLanguage: "sq",
      sources: "burim i pavlefshëm"
    });

    expect(result.version).toBe("1.0.0");
    expect(result.sourceVerification).not.toBeNull();
    expect(result.errors).not.toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  test("ekspozon një objekt pipeline të pandryshueshëm", () => {
    const pipeline = createResponseQualityPipeline();

    expect(Object.isFrozen(pipeline)).toBe(true);
    expect(typeof pipeline.evaluate).toBe("function");
  });

  test("nuk ndryshon versionin ndërmjet thirrjeve", () => {
    const pipeline = createResponseQualityPipeline();

    const first = pipeline.evaluate({
      answer: "Përgjigjja e parë.",
      expectedLanguage: "sq",
      sources: []
    });

    const second = pipeline.evaluate({
      answer: "Përgjigjja e dytë.",
      expectedLanguage: "en",
      sources: []
    });

    expect(first.version).toBe("1.0.0");
    expect(second.version).toBe("1.0.0");
  });

  test("përdor të njëjtën strukturë bazë në rezultate të ndryshme", () => {
    const pipeline = createResponseQualityPipeline();

    const validResult = pipeline.evaluate({
      answer: "Kjo është një përgjigje e vlefshme për testim.",
      expectedLanguage: "sq",
      sources: []
    });

    const invalidResult = pipeline.evaluate(null);

    const expectedKeys = [
      "version",
      "quality",
      "sourceVerification",
      "report",
      "errors"
    ];

    expect(Object.keys(validResult).sort()).toEqual(
      [...expectedKeys].sort()
    );

    expect(Object.keys(invalidResult).sort()).toEqual(
      [...expectedKeys].sort()
    );
  });

  test("nuk ndan gabimet ndërmjet kërkesave të ndryshme", () => {
    const pipeline = createResponseQualityPipeline();

    const invalidResult = pipeline.evaluate(null);

    const validResult = pipeline.evaluate({
      answer:
        "Kjo është një përgjigje e qartë që përdoret për testimin e pipeline-it.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(invalidResult.errors).toContainEqual({
      code: "INVALID_INPUT",
      message: "Hyrja duhet të jetë objekt."
    });

    expect(validResult.errors).not.toContainEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  test("përdor rezultate të ndara për kërkesa të njëpasnjëshme", () => {
    const pipeline = createResponseQualityPipeline();

    const first = pipeline.evaluate({
      answer:
        "Kjo është përgjigjja e parë për kontrollin e cilësisë.",
      expectedLanguage: "sq",
      sources: []
    });

    const second = pipeline.evaluate({
      answer:
        "This is the second answer used to test the quality pipeline.",
      expectedLanguage: "en",
      sources: []
    });

    expect(first).not.toBe(second);
    expect(first.quality).toBeDefined();
    expect(second.quality).toBeDefined();
    expect(first.report).toBeDefined();
    expect(second.report).toBeDefined();
  });

  test("ruan informacionin për burimet në rezultatin e integruar", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      answer:
        "Kjo përgjigje shpjegon një temë dhe përmban një burim për shqyrtim.",
      expectedLanguage: "sq",
      sources: [
        {
          title: "Burim prove",
          content: "Përmbajtje prove pa verifikim të pavarur."
        }
      ]
    });

    expect(result.sourceVerification).not.toBeNull();
    expect(result.sourceVerification.results).toBeDefined();
    expect(result.report).toBeDefined();
    expect(result.report).toHaveProperty("dimensions");
    expect(result.report).toHaveProperty("recommendations");
  });

  test("kthen rezultate pa pretenduar verifikim të pavarur të fakteve", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate({
      query: "Çfarë është një fakt?",
      answer:
        "Një fakt është një pohim që mund të kontrollohet kundrejt provave.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(result.quality).not.toBeNull();

    if (result.sourceVerification) {
      expect(result.sourceVerification.verifiedCount ?? 0).toBe(0);
      expect(
        result.sourceVerification.trustEstablishedCount ?? 0
      ).toBe(0);
    }
  });

  test("përputh numrin e rezultateve të verifikimit me burimet e dhëna", () => {
    const pipeline = createResponseQualityPipeline();

    const sources = [
      {
        title: "Burimi i parë",
        content: "Përmbajtje e parë për testim."
      },
      {
        title: "Burimi i dytë",
        content: "Përmbajtje e dytë për testim."
      }
    ];

    const result = pipeline.evaluate({
      answer: "Kjo përgjigje përdoret për testimin e dy burimeve.",
      expectedLanguage: "sq",
      sources
    });

    expect(result.sourceVerification).not.toBeNull();
    expect(result.sourceVerification.results).toHaveLength(sources.length);
    expect(result.sourceVerification.verifiedCount).toBe(0);
    expect(result.sourceVerification.trustEstablishedCount).toBe(0);
  });

  test("ruan ndarjen ndërmjet burimeve të kërkesave të ndryshme", () => {
    const pipeline = createResponseQualityPipeline();

    const first = pipeline.evaluate({
      answer: "Përgjigjja e parë me një burim.",
      expectedLanguage: "sq",
      sources: [
        {
          title: "Burimi A",
          content: "Përmbajtja A."
        }
      ]
    });

    const second = pipeline.evaluate({
      answer: "Përgjigjja e dytë pa burime.",
      expectedLanguage: "sq",
      sources: []
    });

    expect(first.sourceVerification).not.toBeNull();
    expect(second.sourceVerification).not.toBeNull();
    expect(first.sourceVerification.results).toHaveLength(1);
    expect(second.sourceVerification.results).toHaveLength(0);
  });
});
