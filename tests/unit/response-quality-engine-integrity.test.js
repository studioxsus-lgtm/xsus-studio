import { describe, expect, test } from "vitest";

import {
  evaluateResponseQuality,
  RESPONSE_QUALITY_VERSION,
  RESPONSE_QUALITY_DIMENSIONS
} from "../../src/core/response-quality-engine.js";

describe("XSUS AI Core — Response Quality Engine Integrity", () => {
  test("ruan versionin publik 1.0.0", () => {
    expect(RESPONSE_QUALITY_VERSION).toBe("1.0.0");
  });

  test("ekspozon dimensionet si listë të pandryshueshme", () => {
    expect(Object.isFrozen(RESPONSE_QUALITY_DIMENSIONS)).toBe(true);

    expect(RESPONSE_QUALITY_DIMENSIONS).toEqual([
      "completeness",
      "clarity",
      "language",
      "sources"
    ]);
  });

  test("kthen rezultat të strukturuar dhe të ngrirë", () => {
    const result = evaluateResponseQuality({
      query: "Çfarë është uji?",
      answer: "Uji është një përbërje kimike e hidrogjenit dhe oksigjenit.",
      requestedLanguage: "sq",
      responseLanguage: "sq",
      sources: []
    });

    expect(result.version).toBe("1.0.0");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.dimensions)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });

  test("ruan emrat dhe rendin e dimensioneve", () => {
    const result = evaluateResponseQuality({
      query: "Pyetje prove",
      answer: "Kjo është një përgjigje e mjaftueshme për testimin.",
      sources: []
    });

    expect(Object.keys(result.dimensions)).toEqual([
      "completeness",
      "clarity",
      "language",
      "sources"
    ]);
  });

  test("nuk ndryshon hyrjen origjinale", () => {
    const input = {
      query: "  Çfarë është uji?  ",
      answer: "  Uji është një përbërje kimike.  ",
      requestedLanguage: "sq",
      responseLanguage: "sq",
      sources: [
        {
          title: "Burim prove",
          content: "Përmbajtje prove."
        }
      ]
    };

    const originalInput = structuredClone(input);

    evaluateResponseQuality(input);

    expect(input).toEqual(originalInput);
  });

  test("nuk pretendon verifikim të gjuhës kur mungojnë të dhënat", () => {
    const result = evaluateResponseQuality({
      query: "Pyetje prove",
      answer: "Kjo është një përgjigje për testim.",
      sources: []
    });

    expect(result.dimensions.language).toBeNull();
  });

  test("regjistron gabimet e query dhe answer të munguara", () => {
    const result = evaluateResponseQuality({
      query: "",
      answer: "",
      sources: []
    });

    expect(result.errors).toContain("EMPTY_QUERY");
    expect(result.errors).toContain("EMPTY_ANSWER");
    expect(result.valid).toBe(false);
  });

  test("normalizon kodet e gjuhëve me rajone", () => {
    const result = evaluateResponseQuality({
      query: "Test query",
      answer: "This is a sufficiently clear answer for testing.",
      requestedLanguage: "en-US",
      responseLanguage: "en-GB",
      sources: []
    });

    expect(result.errors).not.toContain(
      "UNSUPPORTED_REQUESTED_LANGUAGE"
    );

    expect(result.errors).not.toContain(
      "UNSUPPORTED_RESPONSE_LANGUAGE"
    );
  });

  test("kthen rezultat të veçantë për çdo thirrje", () => {
    const first = evaluateResponseQuality({
      query: "Pyetja e parë",
      answer: "Kjo është përgjigjja e parë për testim.",
      sources: []
    });

    const second = evaluateResponseQuality({
      query: "Pyetja e dytë",
      answer: "Kjo është përgjigjja e dytë për testim.",
      sources: []
    });

    expect(first).not.toBe(second);
    expect(first.dimensions).not.toBe(second.dimensions);
    expect(first.errors).not.toBe(second.errors);
  });
});
