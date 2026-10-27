import { describe, expect, test } from "vitest";

import {
  RESPONSE_QUALITY_VERSION,
  RESPONSE_QUALITY_DIMENSIONS,
  evaluateResponseQuality
} from "../../src/core/response-quality-engine.js";

describe("XSUS Response Quality Engine", () => {
  const standardInput = {
    query: "What is artificial intelligence?",
    answer:
      "Artificial intelligence is a field of computer science that focuses on creating systems capable of performing tasks that normally require human intelligence.",
    requestedLanguage: "en",
    responseLanguage: "en",
    sources: [
      {
        id: "source-1",
        title: "AI Introduction",
        content: "Artificial intelligence overview."
      }
    ]
  };

  test("ka versionin dhe strukturën e pritshme", () => {
    const result = evaluateResponseQuality(standardInput);

    expect(RESPONSE_QUALITY_VERSION).toBe("1.0.0");
    expect(result.version).toBe("1.0.0");
    expect(result).toHaveProperty("valid", true);
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("dimensions");
    expect(result).toHaveProperty("sourceCount", 1);
    expect(result).toHaveProperty("languageVerification");
    expect(result).toHaveProperty("errors");

    expect(result.dimensions.language).toBe(100);
    expect(result.errors).toEqual([]);
  });

  test("identifikon pyetjen dhe përgjigjen bosh", () => {
    const result = evaluateResponseQuality({
      query: "   ",
      answer: "",
      requestedLanguage: "en",
      responseLanguage: "en"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("EMPTY_QUERY");
    expect(result.errors).toContain("EMPTY_ANSWER");
    expect(result.dimensions.completeness).toBe(0);
    expect(result.dimensions.clarity).toBe(0);
  });

  test("normalizon kodet e gjuhëve", () => {
    const result = evaluateResponseQuality({
      query: "Explain artificial intelligence.",
      answer: standardInput.answer,
      requestedLanguage: "en-US",
      responseLanguage: "en"
    });

    expect(result.dimensions.language).toBe(100);
    expect(result.languageVerification).not.toBeNull();
    expect(result.languageVerification.requestedLanguage).toBe("en");
  });

  test("normalizon kodet e gjuhëve me nënvizë", () => {
    const result = evaluateResponseQuality({
      ...standardInput,
      requestedLanguage: "en_US",
      responseLanguage: "en-GB"
    });

    expect(result.dimensions.language).toBe(100);
  });

  test("identifikon mospërputhjen e gjuhës", () => {
    const result = evaluateResponseQuality({
      query: "Shpjego inteligjencën artificiale.",
      answer:
        "Artificial intelligence is a field of computer science that develops intelligent systems.",
      requestedLanguage: "sq",
      responseLanguage: "en"
    });

    expect(result.dimensions.language).toBe(0);
  });

  test("identifikon kodin e pambështetur të gjuhës së kërkuar", () => {
    const result = evaluateResponseQuality({
      ...standardInput,
      requestedLanguage: "xx"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "UNSUPPORTED_REQUESTED_LANGUAGE"
    );
  });

  test("identifikon kodin e pambështetur të gjuhës së përgjigjes", () => {
    const result = evaluateResponseQuality({
      ...standardInput,
      responseLanguage: "xx"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "UNSUPPORTED_RESPONSE_LANGUAGE"
    );
  });

  test("nuk e përsërit gabimin për kodin e njëjtë të pambështetur", () => {
    const result = evaluateResponseQuality({
      ...standardInput,
      requestedLanguage: "xx",
      responseLanguage: "yy"
    });

    expect(
      result.errors.filter(
        (error) => error === "UNSUPPORTED_REQUESTED_LANGUAGE"
      )
    ).toHaveLength(1);

    expect(
      result.errors.filter(
        (error) => error === "UNSUPPORTED_RESPONSE_LANGUAGE"
      )
    ).toHaveLength(1);
  });

  test("kryen verifikimin e gjuhës kur ajo kërkohet", () => {
    const result = evaluateResponseQuality(standardInput);

    expect(result.languageVerification).not.toBeNull();
    expect(result.languageVerification.requestedLanguage).toBe("en");
    expect(result.dimensions.language).toBe(100);
  });

  test("nuk kërkon verifikim kur gjuha nuk specifikohet", () => {
    const result = evaluateResponseQuality({
      query: "Explain artificial intelligence.",
      answer: standardInput.answer
    });

    expect(result.dimensions.language).toBeNull();
    expect(result.languageVerification).toBeNull();
  });

  test("filtron burimet e pavlefshme sipas rregullave aktuale", () => {
    const result = evaluateResponseQuality({
      ...standardInput,
      sources: [
        "Burim i vlefshëm",
        null,
        {},
        { title: "Burim tjetër" },
        42
      ]
    });

    expect(result.sourceCount).toBe(2);
    expect(result.dimensions.sources).toBe(100);
  });

  test("vlerëson rastin pa burime", () => {
    const result = evaluateResponseQuality({
      ...standardInput,
      sources: []
    });

    expect(result.sourceCount).toBe(0);
    expect(result.dimensions.sources).toBe(50);
  });

  test("trajton listën e burimeve jo-array si listë bosh", () => {
    const result = evaluateResponseQuality({
      ...standardInput,
      sources: "not-an-array"
    });

    expect(result.sourceCount).toBe(0);
    expect(result.dimensions.sources).toBe(50);
  });

  test("pranon burime me përmbajtje tekstuale", () => {
    const result = evaluateResponseQuality({
      ...standardInput,
      sources: [
        {
          id: "source-content-1",
          content: "Artificial intelligence research and definitions."
        }
      ]
    });

    expect(result.sourceCount).toBe(1);
    expect(result.dimensions.sources).toBe(100);
  });

  test("nuk numëron burime me tekst bosh", () => {
    const result = evaluateResponseQuality({
      ...standardInput,
      sources: [
        "",
        "   ",
        null,
        {},
        [],
        42
      ]
    });

    expect(result.sourceCount).toBe(0);
    expect(result.dimensions.sources).toBe(50);
  });

  test("përdor dimensionet e përcaktuara", () => {
    const result = evaluateResponseQuality(standardInput);

    expect(Object.keys(result.dimensions)).toEqual(
      [...RESPONSE_QUALITY_DIMENSIONS]
    );
  });

  test("dimensionet janë të ngrira dhe nuk ndryshojnë", () => {
    expect(Object.isFrozen(RESPONSE_QUALITY_DIMENSIONS)).toBe(true);
  });

  test("dimensionet kanë vlera numerike nga 0 deri në 100 ose null", () => {
    const result = evaluateResponseQuality(standardInput);

    for (const value of Object.values(result.dimensions)) {
      if (value === null) {
        continue;
      }

      expect(typeof value).toBe("number");
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  test("rezultati i përgjithshëm është mesatarja e dimensioneve numerike", () => {
    const result = evaluateResponseQuality({
      query: "AI?",
      answer: "AI works.",
      sources: []
    });

    const values = Object.values(result.dimensions).filter(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value)
    );

    const expectedScore =
      values.length === 0
        ? 0
        : Math.round(
            (values.reduce((sum, value) => sum + value, 0) /
              values.length) *
              100
          ) / 100;

    expect(result.score).toBe(expectedScore);
  });

  test("rezultati i përgjithshëm është brenda kufijve", () => {
    const result = evaluateResponseQuality(standardInput);

    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test("rezultati dhe koleksionet e tij janë të pandryshueshme", () => {
    const result = evaluateResponseQuality(standardInput);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.dimensions)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });

  test.each([null, "invalid", []])(
    "refuzon hyrjen e pavlefshme: %s",
    (input) => {
      expect(() => evaluateResponseQuality(input)).toThrow(
        TypeError
      );
    }
  );

  test("pranon objekt bosh, por raporton fushat e detyrueshme që mungojnë", () => {
    const result = evaluateResponseQuality({});

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("EMPTY_QUERY");
    expect(result.errors).toContain("EMPTY_ANSWER");
    expect(result.dimensions.completeness).toBe(0);
    expect(result.dimensions.clarity).toBe(0);
    expect(result.dimensions.language).toBeNull();
    expect(result.sourceCount).toBe(0);
  });

  test("nuk i konsideron burimet provë automatike të saktësisë", () => {
    const result = evaluateResponseQuality({
      query: "What is AI?",
      answer: "Artificial intelligence is a field of computer science.",
      sources: [
        {
          id: "source-1",
          title: "AI introduction",
          url: "not-a-verified-source"
        }
      ]
    });

    expect(result.sourceCount).toBe(1);
    expect(result.dimensions.sources).toBe(100);
  });

  test("pikëzon plotësinë sipas gjatësisë së përgjigjes", () => {
    const cases = [
      { length: 19, expected: 25 },
      { length: 20, expected: 60 },
      { length: 79, expected: 60 },
      { length: 80, expected: 80 },
      { length: 239, expected: 80 },
      { length: 240, expected: 100 }
    ];

    for (const { length, expected } of cases) {
      const result = evaluateResponseQuality({
        query: "Explain AI",
        answer: "a".repeat(length)
      });

      expect(result.dimensions.completeness).toBe(expected);
    }
  });

  test("plotësia është zero kur mungon pyetja ose përgjigjja", () => {
    expect(
      evaluateResponseQuality({
        query: "",
        answer: "A".repeat(300)
      }).dimensions.completeness
    ).toBe(0);

    expect(
      evaluateResponseQuality({
        query: "Explain AI",
        answer: ""
      }).dimensions.completeness
    ).toBe(0);
  });

  test("pikëzon qartësinë e përgjigjeve shumë të shkurtra", () => {
    const result = evaluateResponseQuality({
      query: "AI?",
      answer: "AI works."
    });

    expect(result.dimensions.clarity).toBe(35);
  });

  test("kufizon pikët e qartësisë për përgjigjet tepër të gjata", () => {
    const result = evaluateResponseQuality({
      query: "Explain AI",
      answer: "word ".repeat(2401)
    });

    expect(result.dimensions.clarity).toBe(50);
  });

  test("kufizon pikët e qartësisë kur fjalët janë tepër të gjata", () => {
    const result = evaluateResponseQuality({
      query: "Explain AI",
      answer: "x".repeat(124)
    });

    expect(result.dimensions.clarity).toBe(35);
  });

  test("nuk i konsideron burimet prova të verifikuara", () => {
    const result = evaluateResponseQuality({
      ...standardInput,
      sources: [
        {
          title: "Example",
          content: "Example source content.",
          url: "https://example.com"
        }
      ]
    });

    expect(result.dimensions.sources).toBe(100);
    expect(result.sourceCount).toBe(1);
  });
});
