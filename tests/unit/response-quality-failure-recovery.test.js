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

describe("XSUS AI Core — Response Quality Failure Recovery", () => {
afterEach(() => {
vi.restoreAllMocks();
vi.resetAllMocks();
});

test("përgjigjja kryesore funksionon kur vlerësimi i cilësisë dështon", async () => {
qualityEngine.evaluateResponseQuality.mockImplementation(() => {
throw new Error("Quality engine unavailable");
});

const result = await processAIRequest({
  query: "Çfarë është inteligjenca artificiale?",
});

expect(result).toBeDefined();
expect(result).toHaveProperty("metadata");
expect(result.metadata.responseQuality).toBeNull();
expect(result).not.toHaveProperty("error");

});

test("përdor vlerësimin e cilësisë kur ai funksionon", async () => {
qualityEngine.evaluateResponseQuality.mockReturnValue({
version: "1.0.0",
valid: true,
score: 95,
dimensions: {
completeness: 100,
clarity: 100,
language: 100,
sources: 80,
},
sourceCount: 1,
languageVerification: null,
errors: [],
});

const result = await processAIRequest({
  query: "Çfarë është inteligjenca artificiale?",
});

expect(result).toBeDefined();
expect(result).toHaveProperty("metadata");
expect(result.metadata.responseQuality).not.toBeNull();
expect(result.metadata.responseQuality.score).toBe(95);

});
});
