import { describe, expect, test, vi } from "vitest";

import {
  evaluateResponseQuality,
  RESPONSE_QUALITY_VERSION,
  RESPONSE_QUALITY_DIMENSIONS,
} from "../../src/core/response-quality-engine.js";

describe("XSUS AI Core — Response Quality Engine", () => {
  test("ka versionin e pritshëm", () => {
    expect(RESPONSE_QUALITY_VERSION).toBe("1.0.0");
  });

  test("vlerëson një përgjigje me strukturën e pritshme", () => {
    const result = evaluateResponseQuality({
      query: "Çfarë është inteligjenca artificiale?",
      answer:
        "Inteligjenca artificiale është një fushë e informatikës që zhvillon sisteme të afta të kryejnë detyra që zakonisht kërkojnë inteligjencë njerëzore.",
      requestedLanguage: "sq",
      responseLanguage: "sq",
      sources: [
        {
          id: "source-1",
          title: "Hyrje në inteligjencën artificiale",
        },
      ],
    });

    expect(result.version).toBe("1.0.0");
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.dimensions.language).toBe(100);
    expect(result.sourceCount).toBe(1);
    expect(result.errors).toEqual([]);
    expect(result).toHaveProperty("languageVerification");
  });

  test("identifikon një pyetje bosh", () => {
    const result = evaluateResponseQuality({
      query: "   ",
      answer: "Kjo është një përgjigje e vlefshme.",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("EMPTY_QUERY");
  });

  test("identifikon një përgjigje bosh", () => {
    const result = evaluateResponseQuality({
      query: "Çfarë është XSUS AI?",
      answer: "   ",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("EMPTY_ANSWER");
    expect(result.dimensions.completeness).toBe(0);
    expect(result.dimensions.clarity).toBe(0);
  });

  test("normalizon kodet e gjuhëve", () => {
    const result = evaluateResponseQuality({
      query: "What is AI?",
      answer:
        "Artificial intelligence is a field of computer science.",
      requestedLanguage: "en-US",
      responseLanguage: "en",
    });

    expect(result.dimensions.language).toBe(100);
  });

  test("identifikon mospërputhjen e kodeve të gjuhëve", () => {
    const result = evaluateResponseQuality({
      query: "Shpjego inteligjencën artificiale.",
      answer:
        "Artificial intelligence is a field of computer science.",
      requestedLanguage: "sq",
      responseLanguage: "en",
    });

    expect(result.dimensions.language).toBe(0);
  });

  test("refuzon kodet e gjuhëve të pambështetura", () => {
    const result = evaluateResponseQuality({
      query: "Test",
      answer: "Kjo është një përgjigje testuese.",
      requestedLanguage: "xx",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "UNSUPPORTED_REQUESTED_LANGUAGE",
    );
  });

  test("identifikon gjuhën e kërkuar në analizën e përgjigjes", () => {
    const result = evaluateResponseQuality({
      query: "What is artificial intelligence?",
      answer:
        "Artificial intelligence is a field of computer science that develops intelligent systems.",
      requestedLanguage: "en",
      responseLanguage: "en",
    });

    expect(result.languageVerification).not.toBeNull();
    expect(result).toHaveProperty(
      "languageVerification.requestedLanguage",
      "en",
    );
  });

  test("përgjigjja pa gjuhë të kërkuar nuk kërkon verifikim", () => {
    const result = evaluateResponseQuality({
      query: "Test",
      answer: "Kjo është një përgjigje testuese.",
    });

    expect(result.dimensions.language).toBeNull();
    expect(result.languageVerification).toBeNull();
  });

  test("filtron burimet e pavlefshme", () => {
    const result = evaluateResponseQuality({
      query: "Çfarë është AI?",
      answer:
        "Inteligjenca artificiale është një fushë e informatikës.",
      sources: [
        "Burim i vlefshëm",
        null,
        {},
        { title: "Burim tjetër" },
        42,
      ],
    });

    expect(result.sourceCount).toBe(2);
    expect(result.dimensions.sources).toBe(100);
  });

  test("llogarit rezultatin e burimeve kur nuk ka burime", () => {
    const result = evaluateResponseQuality({
      query: "What is AI?",
      answer:
        "Artificial intelligence is a field of computer science.",
      sources: [],
    });

    expect(result.sourceCount).toBe(0);
    expect(result.dimensions.sources).toBe(50);
  });

  test("rezultati përmban të gjitha dimensionet", () => {
    const result = evaluateResponseQuality({
      query: "Test",
      answer: "Kjo është një përgjigje testuese.",
    });

    expect(Object.keys(result.dimensions)).toEqual(
      [...RESPONSE_QUALITY_DIMENSIONS],
    );
  });

  test("dimensionet kanë vlera numerike ose null", () => {
    const result = evaluateResponseQuality({
      query: "Test",
      answer: "Kjo është një përgjigje testuese.",
    });

    for (const value of Object.values(result.dimensions)) {
      expect(
        value === null ||
          (typeof value === "number" &&
            value >= 0 &&
            value <= 100),
      ).toBe(true);
    }
  });

  test("rezultati përmban vetëm pikë të kufizuara", () => {
    const result = evaluateResponseQuality({
      query: "Çfarë është XSUS AI?",
      answer:
        "XSUS AI është një sistem inteligjence artificiale shumëgjuhëshe.",
      requestedLanguage: "sq",
      responseLanguage: "sq",
    });

    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test("nuk lejon ndryshimin e rezultatit dhe dimensioneve", () => {
    const result = evaluateResponseQuality({
      query: "Test",
      answer: "Kjo është një përgjigje testuese.",
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.dimensions)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });

  test("refuzon hyrje që nuk janë objekt", () => {
    expect(() => evaluateResponseQuality(null)).toThrow(
      "Të dhënat e vlerësimit duhet të jenë objekt.",
    );

    expect(() => evaluateResponseQuality("test")).toThrow(
      "Të dhënat e vlerësimit duhet të jenë objekt.",
    );

    expect(() => evaluateResponseQuality([])).toThrow(
      "Të dhënat e vlerësimit duhet të jenë objekt.",
    );
  });
});
