import { describe, expect, test } from "vitest";

import {
RESPONSE_QUALITY_VERSION,
RESPONSE_QUALITY_DIMENSIONS,
evaluateResponseQuality
} from "../../src/core/response-quality-engine.js";

describe("XSUS Response Quality Engine", () => {
test("ka versionin dhe strukturën e pritshme", () => {
const result = evaluateResponseQuality({
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
});

expect(RESPONSE_QUALITY_VERSION).toBe("1.0.0");
expect(result.version).toBe("1.0.0");
expect(result).toHaveProperty("valid");
expect(result).toHaveProperty("score");
expect(result).toHaveProperty("dimensions");
expect(result).toHaveProperty("sourceCount");
expect(result).toHaveProperty("languageVerification");
expect(result).toHaveProperty("errors");

expect(result.dimensions.language).toBe(100);
expect(result.sourceCount).toBe(1);
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
answer:
"Artificial intelligence is a field of computer science that develops systems capable of performing tasks associated with human intelligence.",
requestedLanguage: "en-US",
responseLanguage: "en"
});

expect(result.dimensions.language).toBe(100);
expect(result.languageVerification).not.toBeNull();
expect(result.languageVerification.requestedLanguage).toBe("en");

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

test("identifikon kodin e pambështetur të gjuhës", () => {
const result = evaluateResponseQuality({
query: "Explain artificial intelligence.",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of performing tasks associated with human intelligence.",
requestedLanguage: "xx",
responseLanguage: "en"
});

expect(result.valid).toBe(false);
expect(result.errors).toContain(
  "UNSUPPORTED_REQUESTED_LANGUAGE"
);

});

test("kryen verifikimin e gjuhës kur kërkohet", () => {
const result = evaluateResponseQuality({
query: "What is artificial intelligence?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of performing tasks associated with human intelligence.",
requestedLanguage: "en",
responseLanguage: "en"
});

expect(result.languageVerification).not.toBeNull();
expect(result.languageVerification.requestedLanguage).toBe("en");
expect(result.dimensions.language).toBe(100);

});

test("nuk kërkon verifikim kur gjuha nuk specifikohet", () => {
const result = evaluateResponseQuality({
query: "Explain artificial intelligence.",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of performing tasks associated with human intelligence."
});

expect(result.dimensions.language).toBeNull();
expect(result.languageVerification).toBeNull();

});

test("filtron burimet e pavlefshme", () => {
const result = evaluateResponseQuality({
query: "What is artificial intelligence?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of performing tasks associated with human intelligence.",
sources: [
"Burim i vlefshëm",
null,
{},
{
title: "Burim tjetër"
},
42
]
});

expect(result.sourceCount).toBe(2);
expect(result.dimensions.sources).toBe(100);

});

test("vlerëson rastin pa burime", () => {
const result = evaluateResponseQuality({
query: "What is artificial intelligence?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of performing tasks associated with human intelligence.",
sources: []
});

expect(result.sourceCount).toBe(0);
expect(result.dimensions.sources).toBe(50);

});

test("përdor dimensionet e përcaktuara", () => {
const result = evaluateResponseQuality({
query: "What is artificial intelligence?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of performing tasks associated with human intelligence.",
requestedLanguage: "en",
responseLanguage: "en",
sources: ["AI documentation"]
});

expect(Object.keys(result.dimensions)).toEqual(
  [...RESPONSE_QUALITY_DIMENSIONS]
);

});

test("dimensionet kanë vlera numerike nga 0 deri në 100 ose null", () => {
const result = evaluateResponseQuality({
query: "What is artificial intelligence?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of performing tasks associated with human intelligence.",
requestedLanguage: "en",
responseLanguage: "en"
});

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

test("rezultati i përgjithshëm është brenda kufijve", () => {
const result = evaluateResponseQuality({
query: "What is artificial intelligence?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of performing tasks associated with human intelligence.",
requestedLanguage: "en",
responseLanguage: "en",
sources: ["AI documentation"]
});

expect(Number.isFinite(result.score)).toBe(true);
expect(result.score).toBeGreaterThanOrEqual(0);
expect(result.score).toBeLessThanOrEqual(100);

});

test("rezultati dhe koleksionet e tij janë të pandryshueshme", () => {
const result = evaluateResponseQuality({
query: "What is artificial intelligence?",
answer:
"Artificial intelligence is a field of computer science that develops systems capable of performing tasks associated with human intelligence.",
requestedLanguage: "en",
responseLanguage: "en",
sources: ["AI documentation"]
});

expect(Object.isFrozen(result)).toBe(true);
expect(Object.isFrozen(result.dimensions)).toBe(true);
expect(Object.isFrozen(result.errors)).toBe(true);

});

test.each([null, "invalid", []])(
"refuzon hyrjen e pavlefshme: %s",
(input) => {
expect(() => evaluateResponseQuality(input)).toThrow();
}
);

test("nuk i konsideron burimet provë automatike të saktësisë", () => {
const result = evaluateResponseQuality({
query: "What is AI?",
answer:
"Artificial intelligence is a field of computer science.",
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

// Ky test dokumenton sjelljen aktuale:
// prania e burimit nuk verifikon përmbajtjen e tij.
// Vlerësimi i besueshmërisë do të implementohet veçmas.

});

test("burimet bosh nuk numërohen si burime të vlefshme", () => {
const result = evaluateResponseQuality({
query: "What is AI?",
answer:
"Artificial intelligence is a field of computer science.",
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

test("pranon burime me përmbajtje tekstuale", () => {
const result = evaluateResponseQuality({
query: "What is AI?",
answer:
"Artificial intelligence is a field of computer science.",
sources: [
{
id: "source-content-1",
content:
"Artificial intelligence research and definitions."
}
]
});

expect(result.sourceCount).toBe(1);
expect(result.dimensions.sources).toBe(100);

});
});
