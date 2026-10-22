import { beforeEach, describe, expect, test, vi } from "vitest";

const { searchKnowledgeMock } = vi.hoisted(() => ({
searchKnowledgeMock: vi.fn()
}));

vi.mock("../../src/knowledge/knowledge-service.js", () => ({
searchKnowledge: searchKnowledgeMock
}));

import { processAIRequest } from "../../src/core/ai-core.js";

describe("XSUS AI Core — Error Handling Integration", () => {
beforeEach(() => {
searchKnowledgeMock.mockReset();
});

test("trajton gabimin e papritur të Knowledge Service pa ekspozuar detaje", async () => {
searchKnowledgeMock.mockRejectedValueOnce(
new Error("INTERNAL_PROVIDER_SECRET")
);

const result = await processAIRequest({
  query: "Test i trajtimit të gabimeve",
  language: "sq"
});

expect(searchKnowledgeMock).toHaveBeenCalledTimes(1);

expect(result).toHaveProperty("error");
expect(result.answer).toBe("");
expect(result.error).not.toContain("INTERNAL_PROVIDER_SECRET");
expect(result.metadata.engine).toBe("xsus-ai-core");
expect(result.metadata.version).toBe("1.2.0");

});

test("trajton gabimin e Knowledge Service me metadata të qëndrueshme", async () => {
searchKnowledgeMock.mockRejectedValueOnce(
new Error("Database connection failure")
);

const result = await processAIRequest({
  query: "Test i lidhjes me bazën e njohurive",
  language: "en"
});

expect(result).toHaveProperty("error");
expect(result.answer).toBe("");
expect(result.language).toBe("en");
expect(result.metadata.engine).toBe("xsus-ai-core");
expect(result.metadata.version).toBe("1.2.0");
expect(result.metadata.knowledgeResults).toBe(0);
expect(Array.isArray(result.metadata.sources)).toBe(true);
expect(result.error).not.toContain("Database connection failure");

});

test("përpunon kërkesën pasuese pasi dështon një kërkesë", async () => {
searchKnowledgeMock
.mockRejectedValueOnce(new Error("Temporary provider failure"))
.mockResolvedValueOnce({
success: true,
results: [
{
id: "integration-recovery-001",
title: "JavaScript",
content: "JavaScript është një gjuhë programimi.",
language: "sq",
domain: "programming"
}
],
sources: ["integration-recovery-001"]
});

const failedResult = await processAIRequest({
  query: "Kërkesa e parë",
  language: "sq"
});

expect(failedResult).toHaveProperty("error");
expect(failedResult.answer).toBe("");

const recoveredResult = await processAIRequest({
  query: "Çfarë është JavaScript?",
  language: "sq"
});

expect(searchKnowledgeMock).toHaveBeenCalledTimes(2);
expect(recoveredResult.metadata.engine).toBe("xsus-ai-core");

});
});
