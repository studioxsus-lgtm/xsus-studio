
import { describe, expect, test } from "vitest";

import {
  createResponseQualityPipeline
} from "../../src/core/response-quality-pipeline.js";

import {
  verifyResponseSource,
  verifyResponseSources
} from "../../src/core/response-source-verifier.js";

import {
  processAIRequest
} from "../../src/core/ai-core.js";

describe("XSUS AI Core — Response Source Verification", () => {
  test("pranon një burim me strukturë të vlefshme dhe URL HTTPS", () => {
    const source = {
      id: "source-001",
      title: "Dokumentacioni JavaScript",
      content: "JavaScript është gjuhë programimi.",
      url: "https://example.com/javascript"
    };

    const result = verifyResponseSource(source);

    expect(result).toBeDefined();
    expect(result).toHaveProperty("valid");
    expect(result.valid).toBe(true);
  });

  test("nuk e konsideron një tekst të thjeshtë si burim të verifikuar", () => {
    const result = verifyResponseSource(
      "JavaScript është gjuhë programimi."
    );

    expect(result).toBeDefined();
    expect(result.valid).toBe(false);
  });

  test("refuzon URL që nuk përdor HTTP ose HTTPS", () => {
    const result = verifyResponseSource({
      title: "Burim i pavlefshëm",
      content: "Përmbajtje prove.",
      url: "javascript:alert(1)"
    });

    expect(result).toBeDefined();
    expect(result.valid).toBe(false);
  });

  test("llogarit burimet pa pretenduar se besueshmëria është provuar", () => {
    const result = verifyResponseSources([
      {
        title: "Burim prove",
        content: "Përmbajtje prove.",
        url: "https://example.com/source"
      },
      "Tekst pa URL"
    ]);

    expect(result).toBeDefined();
    expect(result).toHaveProperty("results");
    expect(result).toHaveProperty("verifiedCount");
    expect(result).toHaveProperty("trustEstablishedCount");

    expect(result.verifiedCount).toBe(0);
    expect(result.trustEstablishedCount).toBe(0);
  });

  test("pipeline ruan burimet e strukturuara dhe prodhon rezultat", () => {
    const pipeline = createResponseQualityPipeline();

    const sources = [
      {
        id: "source-002",
        title: "Dokumentacioni",
        content: "Përmbajtje e dokumentacionit.",
        url: "https://example.com/docs"
      }
    ];

    const result = pipeline.evaluate({
      query: "Çfarë është JavaScript?",
      answer: "JavaScript është gjuhë programimi.",
      expectedLanguage: "sq",
      responseLanguage: "sq",
      sources
    });

    expect(result).toBeDefined();
    expect(result.version).toBe("1.0.0");
    expect(result.quality).not.toBeNull();
    expect(result.sourceVerification).not.toBeNull();
    expect(result.report).not.toBeNull();
    expect(result.errors).toEqual([]);

    expect(result.sourceVerification.results).toHaveLength(1);
  });

  test("pipeline raporton hyrje të pavlefshme pa hedhur përjashtim", () => {
    const pipeline = createResponseQualityPipeline();

    const result = pipeline.evaluate(null);

    expect(result).toBeDefined();
    expect(result.quality).toBeNull();
    expect(result.sourceVerification).toBeNull();
    expect(result.report).toBeNull();

    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    ]);
  });

  test("AI Core vazhdon të përgjigjet kur pipeline është i integruar", async () => {
    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq"
    });

    expect(result.answer).toBeTruthy();
    expect(result.error).toBeUndefined();

    expect(result.version).toBe("1.2.0");
    expect(result.metadata.version).toBe("1.2.0");
    expect(result.metadata.engine).toBe("xsus-ai-core");

    expect(result.metadata).toHaveProperty("responseQuality");
  });
});
