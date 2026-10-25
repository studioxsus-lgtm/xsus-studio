import { describe, expect, test } from "vitest";

import {
  RESPONSE_LANGUAGE_VERIFIER_VERSION,
  SUPPORTED_VERIFIER_LANGUAGES,
  verifyResponseLanguage
} from "../../src/core/response-language-verifier.js";

describe("XSUS Response Language Verifier", () => {
  test("ka versionin e pritshëm", () => {
    expect(RESPONSE_LANGUAGE_VERIFIER_VERSION).toBe("1.0.0");
  });

  test("ekspozon listën e gjuhëve të mbështetura", () => {
    expect(SUPPORTED_VERIFIER_LANGUAGES).toContain("sq");
    expect(SUPPORTED_VERIFIER_LANGUAGES).toContain("en");
    expect(SUPPORTED_VERIFIER_LANGUAGES).toContain("fr");
    expect(Object.isFrozen(SUPPORTED_VERIFIER_LANGUAGES)).toBe(true);
  });

  test("identifikon një tekst të qartë në shqip", () => {
    const result = verifyResponseLanguage({
      requestedLanguage: "sq",
      text:
        "Kjo është një përgjigje në gjuhën shqipe. " +
        "Ne mund të shpjegojmë këtë temë dhe të japim " +
        "një përgjigje të qartë për pyetjen tuaj."
    });

    expect(result.valid).toBe(true);
    expect(result.detectedLanguage).toBe("sq");
    expect(result.matches).toBe(true);
    expect(result.status).toBe("match");
  });

  test("identifikon një tekst të qartë në anglisht", () => {
    const result = verifyResponseLanguage({
      requestedLanguage: "en",
      text:
        "This is an answer in the English language. " +
        "The explanation provides useful information " +
        "because the user needs a clear and complete answer."
    });

    expect(result.detectedLanguage).toBe("en");
    expect(result.matches).toBe(true);
    expect(result.status).toBe("match");
  });

  test("identifikon një tekst të qartë në frëngjisht", () => {
    const result = verifyResponseLanguage({
      requestedLanguage: "fr",
      text:
        "Bonjour, voici une réponse en français. " +
        "Cette explication présente les informations " +
        "pour vous aider à comprendre la question."
    });

    expect(result.detectedLanguage).toBe("fr");
    expect(result.matches).toBe(true);
  });

  test("raporton mospërputhjen e gjuhës", () => {
    const result = verifyResponseLanguage({
      requestedLanguage: "en",
      text:
        "Kjo është një përgjigje në gjuhën shqipe. " +
        "Ne mund të shpjegojmë këtë temë dhe të japim " +
        "një përgjigje të qartë për pyetjen tuaj."
    });

    expect(result.valid).toBe(true);
    expect(result.detectedLanguage).toBe("sq");
    expect(result.matches).toBe(false);
    expect(result.status).toBe("mismatch");
  });

  test("normalizon kodet rajonale të gjuhëve", () => {
    const result = verifyResponseLanguage({
      requestedLanguage: "en-US",
      text:
        "This is an answer in the English language. " +
        "The explanation provides useful information " +
        "because the user needs a clear and complete answer."
    });

    expect(result.requestedLanguage).toBe("en");
    expect(result.matches).toBe(true);
  });

  test("trajton tekstin bosh", () => {
    const result = verifyResponseLanguage({
      requestedLanguage: "sq",
      text: "   "
    });

    expect(result.valid).toBe(false);
    expect(result.status).toBe("empty_text");
  });

  test("trajton tekstin tepër të shkurtër", () => {
    const result = verifyResponseLanguage({
      requestedLanguage: "en",
      text: "Hello there."
    });

    expect(result.valid).toBe(true);
    expect(result.detectedLanguage).toBe(null);
    expect(result.matches).toBe(null);
    expect(result.status).toBe("insufficient_text");
  });

  test("trajton gjuhën e pambështetur", () => {
    const result = verifyResponseLanguage({
      requestedLanguage: "xx",
      text:
        "This is a sufficiently long sentence that contains " +
        "several words for testing the language verifier."
    });

    expect(result.valid).toBe(false);
    expect(result.status).toBe("unsupported_language");
  });

  test("trajton input-in e pavlefshëm", () => {
    const result = verifyResponseLanguage(null);

    expect(result.valid).toBe(false);
    expect(result.status).toBe("invalid_input");
  });

  test("kthen strukturën e standardizuar", () => {
    const result = verifyResponseLanguage({
      requestedLanguage: "en",
      text:
        "This is an answer in the English language. " +
        "The explanation provides useful information " +
        "because the user needs a clear and complete answer."
    });

    expect(result).toHaveProperty("version");
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("requestedLanguage");
    expect(result).toHaveProperty("detectedLanguage");
    expect(result).toHaveProperty("matches");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("wordCount");
    expect(result).toHaveProperty("errors");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });
});
