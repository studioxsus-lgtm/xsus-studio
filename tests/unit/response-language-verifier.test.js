import { describe, expect, test } from "vitest";

import {
RESPONSE_LANGUAGE_VERIFIER_VERSION,
SUPPORTED_VERIFIER_LANGUAGES,
verifyResponseLanguage
} from "../../src/core/response-language-verifier.js";

describe("XSUS Response Language Verifier", () => {
const englishText =
"This is an answer in the English language. " +
"The explanation provides useful information " +
"because the user needs a clear and complete answer.";

const albanianText =
"Kjo është një përgjigje në gjuhën shqipe. " +
"Ne mund të shpjegojmë këtë temë dhe të japim " +
"një përgjigje të qartë për pyetjen tuaj.";

const frenchText =
"Bonjour, voici une réponse en français. " +
"Cette explication présente les informations " +
"pour vous aider à comprendre la question.";

test("ka versionin e pritshëm", () => {
expect(RESPONSE_LANGUAGE_VERIFIER_VERSION).toBe("1.0.0");
});

test("ekspozon listën e plotë të gjuhëve të mbështetura", () => {
expect(SUPPORTED_VERIFIER_LANGUAGES).toEqual([
"sq",
"en",
"fr",
"de",
"it",
"es",
"pt",
"nl"
]);

expect(Object.isFrozen(SUPPORTED_VERIFIER_LANGUAGES)).toBe(true);

});

test("identifikon një tekst të qartë në shqip", () => {
const result = verifyResponseLanguage({
requestedLanguage: "sq",
text: albanianText
});

expect(result.valid).toBe(true);
expect(result.requestedLanguage).toBe("sq");
expect(result.detectedLanguage).toBe("sq");
expect(result.matches).toBe(true);
expect(result.status).toBe("match");
expect(result.errors).toEqual([]);

});

test("identifikon një tekst të qartë në anglisht", () => {
const result = verifyResponseLanguage({
requestedLanguage: "en",
text: englishText
});

expect(result.valid).toBe(true);
expect(result.detectedLanguage).toBe("en");
expect(result.matches).toBe(true);
expect(result.status).toBe("match");

});

test("identifikon një tekst të qartë në frëngjisht", () => {
const result = verifyResponseLanguage({
requestedLanguage: "fr",
text: frenchText
});

expect(result.valid).toBe(true);
expect(result.detectedLanguage).toBe("fr");
expect(result.matches).toBe(true);
expect(result.status).toBe("match");

});

test("raporton mospërputhjen e gjuhës", () => {
const result = verifyResponseLanguage({
requestedLanguage: "en",
text: albanianText
});

expect(result.valid).toBe(true);
expect(result.requestedLanguage).toBe("en");
expect(result.detectedLanguage).toBe("sq");
expect(result.matches).toBe(false);
expect(result.status).toBe("mismatch");
expect(result.errors).toHaveLength(1);
expect(result.errors[0]).toContain("sq");
expect(result.errors[0]).toContain("en");

});

test("normalizon kodet rajonale të gjuhëve", () => {
const result = verifyResponseLanguage({
requestedLanguage: "en-US",
text: englishText
});

expect(result.requestedLanguage).toBe("en");
expect(result.detectedLanguage).toBe("en");
expect(result.matches).toBe(true);

});

test.each([
["sq-AL", "sq"],
["fr-FR", "fr"],
["de-DE", "de"],
["it-IT", "it"],
["es-ES", "es"],
["pt-BR", "pt"],
["nl-NL", "nl"]
])(
"pranon kodin rajonal %s dhe e normalizon në %s",
(requestedLanguage, expectedLanguage) => {
const result = verifyResponseLanguage({
requestedLanguage,
text: englishText
});

  expect(result.requestedLanguage).toBe(expectedLanguage);
}

);

test("normalizon hapësirat dhe shkronjat e mëdha në kodin e gjuhës", () => {
const result = verifyResponseLanguage({
requestedLanguage: " EN ",
text: englishText
});

expect(result.requestedLanguage).toBe("en");
expect(result.detectedLanguage).toBe("en");
expect(result.matches).toBe(true);

});

test("trajton tekstin bosh", () => {
const result = verifyResponseLanguage({
requestedLanguage: "sq",
text: "   "
});

expect(result.valid).toBe(false);
expect(result.status).toBe("empty_text");
expect(result.requestedLanguage).toBe("sq");
expect(result.errors).toContain(
  "Teksti i përgjigjes është bosh."
);

});

test("trajton tekstin tepër të shkurtër", () => {
const result = verifyResponseLanguage({
requestedLanguage: "en",
text: "Hello there."
});

expect(result.valid).toBe(true);
expect(result.detectedLanguage).toBe(null);
expect(result.matches).toBe(null);
expect(result.confidence).toBe(0);
expect(result.status).toBe("insufficient_text");
expect(result.errors).toHaveLength(1);

});

test("trajton tekstin me pak fjalë edhe kur ka shenja pikësimi", () => {
const result = verifyResponseLanguage({
requestedLanguage: "en",
text: "Hello, there!"
});

expect(result.status).toBe("insufficient_text");
expect(result.detectedLanguage).toBe(null);
expect(result.matches).toBe(null);

});

test("trajton gjuhën e pambështetur", () => {
const result = verifyResponseLanguage({
requestedLanguage: "xx",
text: englishText
});

expect(result.valid).toBe(false);
expect(result.requestedLanguage).toBe(null);
expect(result.status).toBe("unsupported_language");
expect(result.errors).toContain(
  "Gjuha e kërkuar mungon ose nuk mbështetet."
);

});

test("trajton gjuhën e kërkuar që mungon", () => {
const result = verifyResponseLanguage({
text: englishText
});

expect(result.valid).toBe(false);
expect(result.requestedLanguage).toBe(null);
expect(result.status).toBe("unsupported_language");

});

test("trajton kodin rajonal të pavlefshëm", () => {
const result = verifyResponseLanguage({
requestedLanguage: "en-US-extra",
text: englishText
});

expect(result.valid).toBe(false);
expect(result.requestedLanguage).toBe(null);
expect(result.status).toBe("unsupported_language");

});

test("trajton tekstin që nuk është string", () => {
const result = verifyResponseLanguage({
requestedLanguage: "en",
text: 123
});

expect(result.valid).toBe(false);
expect(result.requestedLanguage).toBe("en");
expect(result.status).toBe("invalid_text");
expect(result.errors).toContain(
  "Teksti i përgjigjes duhet të jetë string."
);

});

test.each([
null,
123,
"tekst",
true,
[]
])("refuzon hyrjen e pavlefshme: %s", (input) => {
const result = verifyResponseLanguage(input);

expect(result.valid).toBe(false);
expect(result.requestedLanguage).toBe(null);
expect(result.status).toBe("invalid_input");
expect(result.errors).toContain(
  "Input duhet të jetë objekt."
);

});

test("trajton thirrjen pa argumente", () => {
const result = verifyResponseLanguage();

expect(result.valid).toBe(false);
expect(result.status).toBe("invalid_text");

});

test("trajton tekstin me shumë pak prova gjuhësore", () => {
const result = verifyResponseLanguage({
requestedLanguage: "en",
text:
"alpha beta gamma delta epsilon zeta eta theta iota kappa"
});

expect(result.valid).toBe(true);
expect(result.detectedLanguage).toBe(null);
expect(result.matches).toBe(null);
expect(result.status).toBe("undetermined");

});

test("kthen numrin e fjalëve në rezultat", () => {
const result = verifyResponseLanguage({
requestedLanguage: "en",
text: englishText
});

expect(result.wordCount).toBeGreaterThan(0);
expect(Number.isInteger(result.wordCount)).toBe(true);
expect(result.wordCount).toBe(
  englishText
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{M}\p{N}'\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .match(/[\p{L}\p{M}\p{N}]+(?:['-][\p{L}\p{M}\p{N}]+)*/gu)
    .length
);

});

test("kthen besueshmëri brenda intervalit zero deri në një", () => {
const result = verifyResponseLanguage({
requestedLanguage: "en",
text: englishText
});

expect(result.confidence).toBeGreaterThanOrEqual(0);
expect(result.confidence).toBeLessThanOrEqual(1);
expect(Number.isFinite(result.confidence)).toBe(true);

});

test("përdor strukturën e standardizuar të rezultatit", () => {
const result = verifyResponseLanguage({
requestedLanguage: "en",
text: englishText
});

expect(result).toEqual(
  expect.objectContaining({
    version: "1.0.0",
    valid: expect.any(Boolean),
    requestedLanguage: "en",
    detectedLanguage: expect.any(String),
    matches: expect.any(Boolean),
    confidence: expect.any(Number),
    status: "match",
    wordCount: expect.any(Number),
    errors: expect.any(Array)
  })
);

expect(Object.isFrozen(result)).toBe(true);
expect(Object.isFrozen(result.errors)).toBe(true);

});

test("përdor strukturë të standardizuar edhe për gabimet", () => {
const result = verifyResponseLanguage({
requestedLanguage: "xx",
text: englishText
});

expect(result).toHaveProperty("version", "1.0.0");
expect(result).toHaveProperty("valid", false);
expect(result).toHaveProperty("requestedLanguage", null);
expect(result).toHaveProperty("detectedLanguage", null);
expect(result).toHaveProperty("matches", null);
expect(result).toHaveProperty("confidence");
expect(result).toHaveProperty("status", "unsupported_language");
expect(result).toHaveProperty("wordCount");
expect(result).toHaveProperty("errors");

expect(Object.isFrozen(result)).toBe(true);
expect(Object.isFrozen(result.errors)).toBe(true);

});

test("nuk ndryshon tekstin origjinal të hyrjes", () => {
const originalText = englishText;
const input = {
requestedLanguage: "en",
text: originalText
};

verifyResponseLanguage(input);

expect(input.text).toBe(originalText);

});

test("nuk ndryshon kodin origjinal të gjuhës në hyrje", () => {
const input = {
requestedLanguage: " EN-US ",
text: englishText
};

verifyResponseLanguage(input);

expect(input.requestedLanguage).toBe(" EN-US ");

});
});
