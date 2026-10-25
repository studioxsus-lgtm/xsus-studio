import { describe, expect, test } from "vitest";

import {
evaluateResponseQuality,
RESPONSE_QUALITY_VERSION,
RESPONSE_QUALITY_DIMENSIONS,
} from "../../src/core/response-quality-engine.js";

describe("XSUS AI Core — Response Quality Contract", () => {
test("përgjigjja përmban të gjitha fushat e kontratës", () => {
const result = evaluateResponseQuality({
query: "What is artificial intelligence?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of learning from data and solving problems.",
requestedLanguage: "en",
responseLanguage: "en",
sources: [{ title: "AI reference" }],
});

expect(Object.keys(result)).toEqual([
  "version",
  "valid",
  "score",
  "dimensions",
  "sourceCount",
  "languageVerification",
  "errors",
]);

});

test("ruan tipet e të dhënave të kontratës", () => {
const result = evaluateResponseQuality({
query: "What is artificial intelligence?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of learning from data and solving problems.",
requestedLanguage: "en",
responseLanguage: "en",
sources: [{ title: "AI reference" }],
});

expect(typeof result.version).toBe("string");
expect(typeof result.valid).toBe("boolean");
expect(typeof result.score).toBe("number");
expect(typeof result.sourceCount).toBe("number");
expect(Array.isArray(result.errors)).toBe(true);
expect(typeof result.dimensions).toBe("object");

});

test("dimensionet kanë emrat e përcaktuar nga kontrata", () => {
const result = evaluateResponseQuality({
query: "Test",
answer: "Kjo është një përgjigje testuese.",
});

expect(Object.keys(result.dimensions)).toEqual([
  ...RESPONSE_QUALITY_DIMENSIONS,
]);

});

test("versioni i rezultatit përputhet me versionin publik", () => {
const result = evaluateResponseQuality({
query: "Test",
answer: "Kjo është një përgjigje testuese.",
});

expect(result.version).toBe(RESPONSE_QUALITY_VERSION);

});

test("rezultati është i fundëm dhe brenda kufijve", () => {
const result = evaluateResponseQuality({
query: "What is artificial intelligence?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of learning from data and solving problems.",
requestedLanguage: "en",
responseLanguage: "en",
});

expect(Number.isFinite(result.score)).toBe(true);
expect(result.score).toBeGreaterThanOrEqual(0);
expect(result.score).toBeLessThanOrEqual(100);

});

test("numri i burimeve nuk është negativ", () => {
const result = evaluateResponseQuality({
query: "What is artificial intelligence?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of learning from data and solving problems.",
sources: [],
});

expect(Number.isInteger(result.sourceCount)).toBe(true);
expect(result.sourceCount).toBeGreaterThanOrEqual(0);

});

test("dimensionet janë të ngrira dhe nuk mund të ndryshohen", () => {
const result = evaluateResponseQuality({
query: "Test",
answer: "Kjo është një përgjigje testuese.",
});

expect(Object.isFrozen(result)).toBe(true);
expect(Object.isFrozen(result.dimensions)).toBe(true);
expect(Object.isFrozen(result.errors)).toBe(true);

});
});
