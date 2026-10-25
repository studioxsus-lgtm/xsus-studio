import { describe, expect, test, vi, afterEach } from "vitest";

import {
evaluateResponseQuality,
RESPONSE_QUALITY_VERSION,
RESPONSE_QUALITY_DIMENSIONS,
} from "../../src/core/response-quality-engine.js";

import * as languageVerifier from "../../src/core/response-language-verifier.js";

describe("XSUS AI Core — Response Quality Engine Edge Cases", () => {
afterEach(() => {
vi.restoreAllMocks();
});

test("ruan versionin e motorit", () => {
expect(RESPONSE_QUALITY_VERSION).toBe("1.0.0");
});

test("trajton përgjigjet shumë të shkurtra pa pretenduar siguri gjuhësore", () => {
const result = evaluateResponseQuality({
query: "What is AI?",
answer: "Hello",
requestedLanguage: "en",
responseLanguage: "en",
});

expect(result.dimensions.language).toBeNull();
expect(result.languageVerification).not.toBeNull();
expect(result.score).toBeGreaterThanOrEqual(0);
expect(result.score).toBeLessThanOrEqual(100);

});

test("trajton mungesën e gjuhës së përgjigjes", () => {
const result = evaluateResponseQuality({
query: "What is AI?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of learning from data.",
requestedLanguage: "en",
});

expect(result.dimensions.language).toBeNull();
expect(result.languageVerification).not.toBeNull();

});

test("trajton mungesën e gjuhës së kërkuar", () => {
const result = evaluateResponseQuality({
query: "What is AI?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of learning from data.",
responseLanguage: "en",
});

expect(result.dimensions.language).toBeNull();
expect(result.languageVerification).toBeNull();

});

test("trajton gjuhën e pambështetur të përgjigjes", () => {
const result = evaluateResponseQuality({
query: "Test",
answer: "Kjo është një përgjigje testuese.",
requestedLanguage: "sq",
responseLanguage: "xx",
});

expect(result.valid).toBe(false);
expect(result.errors).toContain("UNSUPPORTED_RESPONSE_LANGUAGE");
expect(result.dimensions.language).toBeNull();

});

test("nuk jep pikë gjuhësore kur verifikuesi nuk ka prova të mjaftueshme", () => {
const result = evaluateResponseQuality({
query: "What is AI?",
answer: "This is a short text.",
requestedLanguage: "en",
responseLanguage: "en",
});

expect(result.dimensions.language).toBeNull();

});

test("trajton burimet që nuk janë vargje ose objekte të vlefshme", () => {
const result = evaluateResponseQuality({
query: "What is AI?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of learning from data.",
sources: [null, undefined, 42, true, [], {}, "  "],
});

expect(result.sourceCount).toBe(0);
expect(result.dimensions.sources).toBe(50);

});

test("pranon burime me fusha të vlefshme tekstuale", () => {
const result = evaluateResponseQuality({
query: "What is AI?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of learning from data.",
sources: [
{ id: "source-1" },
{ title: "Reference" },
{ url: "https://example.com" },
{ content: "Reference content" },
],
});

expect(result.sourceCount).toBe(4);
expect(result.dimensions.sources).toBe(100);

});

test("normalizon kodet e gjuhëve me nënvizë", () => {
const result = evaluateResponseQuality({
query: "What is AI?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of learning from data and solving problems.",
requestedLanguage: "en_US",
responseLanguage: "en",
});

expect(result.dimensions.language).toBe(100);
expect(result.errors).toEqual([]);

});

test("ruan rendin e dimensioneve të cilësisë", () => {
const result = evaluateResponseQuality({
query: "Test",
answer: "Kjo është një përgjigje testuese.",
});

expect(Object.keys(result.dimensions)).toEqual([
  ...RESPONSE_QUALITY_DIMENSIONS,
]);

});

test("kthen rezultat të ngrirë edhe kur përgjigjja është bosh", () => {
const result = evaluateResponseQuality({
query: "Test",
answer: "",
});

expect(Object.isFrozen(result)).toBe(true);
expect(Object.isFrozen(result.dimensions)).toBe(true);
expect(Object.isFrozen(result.errors)).toBe(true);
expect(result.errors).toContain("EMPTY_ANSWER");

});

test("llogarit rezultatin pa dimensionin e gjuhës kur ai është null", () => {
const result = evaluateResponseQuality({
query: "Test",
answer: "Hello",
requestedLanguage: "en",
});

const applicableScores = Object.values(result.dimensions).filter(
  (value) => value !== null,
);

const expectedScore =
  Math.round(
    (applicableScores.reduce((total, value) => total + value, 0) /
      applicableScores.length) *
      100,
  ) / 100;

expect(result.dimensions.language).toBeNull();
expect(result.score).toBe(expectedScore);

});
});
