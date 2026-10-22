import { describe, expect, test } from "vitest";

import { processAIRequest } from "../../src/core/ai-core.js";

describe("XSUS AI Core — Integration Tests", () => {
test("integron AI Core me shërbimin e njohurive në shqip", async () => {
const result = await processAIRequest({
query: "Çfarë është programimi?",
language: "sq"
});

expect(result.answer).toBeTruthy();
expect(result.language).toBe("sq");
expect(result.source).toBe("xsus-knowledge-service");

expect(result.metadata.engine).toBe("xsus-ai-core");
expect(result.metadata.version).toBe("1.2.0");
expect(result.metadata).toHaveProperty("knowledgeResults");
expect(result.metadata.knowledgeResults).toBeGreaterThanOrEqual(0);
expect(Array.isArray(result.metadata.sources)).toBe(true);

});

test("integron përpunimin e kërkesave në anglisht dhe frëngjisht", async () => {
const englishResult = await processAIRequest({
query: "What is JavaScript?",
language: "en"
});

const frenchResult = await processAIRequest({
  query: "Qu'est-ce que JavaScript?",
  language: "fr"
});

expect(englishResult.answer).toBeTruthy();
expect(englishResult.language).toBe("en");
expect(englishResult.metadata.engine).toBe("xsus-ai-core");

expect(frenchResult.answer).toBeTruthy();
expect(frenchResult.language).toBe("fr");
expect(frenchResult.source).toBe("xsus-knowledge-service");
expect(frenchResult.metadata.engine).toBe("xsus-ai-core");

});

test("integron AI Core me Context Engine dhe historikun e bisedës", async () => {
const conversationId = "integration-context-engine-001";

const result = await processAIRequest({
  query: "Çfarë është JavaScript?",
  language: "sq",
  conversationId,
  messages: [
    {
      role: "user",
      content: "Dua të mësoj programim."
    },
    {
      role: "assistant",
      content: "Mund të fillosh me JavaScript."
    }
  ]
});

expect(result.answer).toBeTruthy();
expect(result.metadata.context).toBeDefined();

expect(result.metadata.context.conversationId).toBe(
  conversationId
);

expect(result.metadata.context.historyMessageCount).toBe(2);
expect(result.metadata.context.hasPreviousContext).toBe(true);

});

test("ruan vazhdimësinë e bisedës ndërmjet dy kërkesave", async () => {
const conversationId = "integration-memory-001";

const firstResult = await processAIRequest({
  query: "Dua të mësoj programim.",
  language: "sq",
  conversationId
});

expect(firstResult.answer).toBeTruthy();

const secondResult = await processAIRequest({
  query: "Cilin hap duhet të ndjek më pas?",
  language: "sq",
  conversationId
});

expect(secondResult.answer).toBeTruthy();
expect(secondResult.metadata.context).toBeDefined();

expect(secondResult.metadata.context.conversationId).toBe(
  conversationId
);

expect(secondResult.metadata.context.hasPreviousContext).toBe(true);

expect(
  secondResult.metadata.context.historyMessageCount
).toBeGreaterThanOrEqual(2);

});

test("kthen përgjigje me strukturë të vlefshme edhe pa rezultate njohurish", async () => {
const result = await processAIRequest({
query: "A ekziston XSUS-TEST-UNKNOWN-92841?",
language: "en"
});

expect(result.answer).toBeTruthy();
expect(result.language).toBe("en");
expect(result.source).toBe("xsus-knowledge-service");

expect(result.metadata).toHaveProperty("knowledgeResults");
expect(result.metadata.knowledgeResults).toBeGreaterThanOrEqual(0);
expect(Array.isArray(result.metadata.sources)).toBe(true);

expect(result.version).toBe("1.2.0");
expect(result.metadata.version).toBe("1.2.0");
expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);

});
});
