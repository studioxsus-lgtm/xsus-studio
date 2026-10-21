import { describe, expect, test } from "vitest";

import {
RESPONSE_ENGINE_VERSION,
normalizeResponseResults,
calculateResponseConfidence,
createResponse,
createResponseMetadata,
getFallbackResponse
} from "../../src/core/response-engine.js";

describe("XSUS Response Engine", () => {
test("përdor versionin e pritshëm", () => {
expect(RESPONSE_ENGINE_VERSION).toBe("1.3.0");
});

test("normalizon dhe pastron rezultatet", () => {
const results = normalizeResponseResults([
{ content: "  Përgjigjja e parë  ", source: "kb-1" },
{ content: "Përgjigjja e parë", source: "kb-2" },
{ content: "Përgjigjja e dytë" },
{ content: "" },
null
]);

expect(results).toHaveLength(2);
expect(results[0].content).toBe("Përgjigjja e parë");
expect(results[0].source).toBe("kb-1");

});

test("mbështet gjuhën shqipe", () => {
const result = createResponse({
results: [{ content: "Përshëndetje!" }],
language: "sq"
});

expect(result.language).toBe("sq");
expect(result.answer).toBe("Përshëndetje!");
expect(result.success).toBe(true);

});

test("bashkon disa rezultate pa dublikime", () => {
const result = createResponse({
results: [
{ content: "Rreshti i parë" },
{ content: "Rreshti i dytë" }
],
language: "sq"
});

expect(result.answer).toBe("Rreshti i parë\n\nRreshti i dytë");

});

test("kthen përgjigje rezervë kur nuk ka rezultate", () => {
const result = createResponse({
results: [],
language: "en"
});

expect(result.success).toBe(false);
expect(result.confidence).toBe(0);
expect(result.answer).toContain("Not enough information");

});

test("llogarit besueshmërinë në intervalin 0–1", () => {
const confidence = calculateResponseConfidence([
{ content: "Përgjigjja A", source: "kb-1" },
{ content: "Përgjigjja B", source: "kb-2" }
]);

expect(confidence).toBeGreaterThanOrEqual(0);
expect(confidence).toBeLessThanOrEqual(1);
expect(confidence).toBeGreaterThan(0);

});

test("krijon metadata me burimet", () => {
const metadata = createResponseMetadata({
language: "fr",
requestId: "test-123",
conversationId: "conversation-1",
results: [
{ content: "Bonjour", source: "kb-fr" }
]
});

expect(metadata.language).toBe("fr");
expect(metadata.requestId).toBe("test-123");
expect(metadata.conversationId).toBe("conversation-1");
expect(metadata.sources).toContain("kb-fr");
expect(metadata.resultCount).toBe(1);

});

test("përdor shqipen për gjuhë të pambështetura", () => {
const result = createResponse({
results: [{ content: "Përgjigje" }],
language: "xx"
});

expect(result.language).toBe("sq");

});

test("kthen përgjigje rezervë përmes funksionit përkatës", () => {
const result = getFallbackResponse("fr");

expect(result.success).toBe(false);
expect(result.language).toBe("fr");
expect(result.confidence).toBe(0);
expect(result.answer).toContain("Les informations trouvées");

});
});
