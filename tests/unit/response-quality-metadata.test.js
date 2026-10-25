import { describe, expect, test, vi, afterEach } from "vitest";

const qualityEngine = vi.hoisted(() => ({
evaluateResponseQuality: vi.fn(),
}));

vi.mock("../../src/core/response-quality-engine.js", () => ({
evaluateResponseQuality: qualityEngine.evaluateResponseQuality,
RESPONSE_QUALITY_VERSION: "1.0.0",
RESPONSE_QUALITY_DIMENSIONS: [
"completeness",
"clarity",
"language",
"sources",
],
}));

import { processAIRequest } from "../../src/core/ai-core.js";

describe("XSUS AI Core — Response Quality Metadata", () => {
afterEach(() => {
vi.restoreAllMocks();
vi.resetAllMocks();
});

test("ekspozon vetëm fushat e lejuara të cilësisë", async () => {
qualityEngine.evaluateResponseQuality.mockReturnValue({
version: "1.0.0",
valid: true,
score: 92,
dimensions: {
completeness: 100,
clarity: 100,
language: 100,
sources: 68,
},
sourceCount: 2,
languageVerification: {
requestedLanguage: "sq",
detectedLanguage: "sq",
confidence: 0.95,
internalDebugData: "must-not-leak",
},
errors: [],
internalDebugData: "must-not-leak",
});

const result = await processAIRequest({
  query: "Çfarë është inteligjenca artificiale?",
});

expect(result).toHaveProperty("metadata.responseQuality");

const quality = result.metadata.responseQuality;

expect(Object.keys(quality)).toEqual([
  "version",
  "valid",
  "score",
  "dimensions",
  "sourceCount",
  "errors",
]);

expect(quality).not.toHaveProperty("languageVerification");
expect(quality).not.toHaveProperty("internalDebugData");
expect(quality.score).toBe(92);
expect(quality.sourceCount).toBe(2);

});

test("ruan metadata.responseQuality null kur vlerësimi dështon", async () => {
qualityEngine.evaluateResponseQuality.mockImplementation(() => {
throw new Error("Quality engine unavailable");
});

const result = await processAIRequest({
  query: "Çfarë është inteligjenca artificiale?",
});

expect(result.metadata.responseQuality).toBeNull();
expect(result).not.toHaveProperty("error");

});
});
