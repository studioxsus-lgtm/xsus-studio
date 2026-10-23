import { describe, expect, test } from "vitest";

import {
validateKnowledgeDataset
} from "../../src/knowledge/knowledge-dataset-validator.js";

import {
searchKnowledge
} from "../../src/knowledge/knowledge-service.js";

describe("XSUS Knowledge Dataset Integration", () => {
const validEntry = (overrides = {}) => ({
id: "sq-general-001",
title: "Përshëndetje",
content: "Përshëndetje! Si mund të të ndihmoj?",
domain: "general",
language: "sq",
...overrides
});

test("dataset-i i vlefshëm standardizohet përpara përdorimit", () => {
const result = validateKnowledgeDataset([
validEntry(),
validEntry({
id: "en-general-001",
title: "Greeting",
content: "Hello! How can I help?",
language: "en"
})
]);

expect(result.valid).toBe(true);
expect(result.collection).toHaveLength(2);
expect(result.collection[0].schemaVersion).toBe("1.3.0");
expect(Object.isFrozen(result.collection)).toBe(true);

});

test("dataset-i i pavlefshëm nuk prodhon koleksion të pjesshëm", () => {
const result = validateKnowledgeDataset([
validEntry(),
validEntry({
id: "",
title: "Hyrje pa ID"
})
]);

expect(result.valid).toBe(false);
expect(result.collection).toBeNull();
expect(result.errors.length).toBeGreaterThan(0);

});

test("validimi nuk ndryshon objektet origjinale", () => {
const entry = validEntry();
const original = { ...entry };

validateKnowledgeDataset([entry]);

expect(entry).toEqual(original);
expect(Object.isFrozen(entry)).toBe(false);

});

test("burimi i integruar i njohurive vazhdon të funksionojë", async () => {
const result = await searchKnowledge("JavaScript", {
language: "en",
domain: "programming"
});

expect(result.success).toBe(true);
expect(Array.isArray(result.results)).toBe(true);
expect(result.results.length).toBeGreaterThan(0);

});

test("dataset i pavlefshëm nuk pengon kërkimet e integruara", async () => {
const dataset = validateKnowledgeDataset([
validEntry({
id: "",
title: "Hyrje e pavlefshme"
})
]);

expect(dataset.valid).toBe(false);
expect(dataset.collection).toBeNull();

const result = await searchKnowledge("JavaScript", {
  language: "en",
  domain: "programming"
});

expect(result.success).toBe(true);
expect(result.results.length).toBeGreaterThan(0);

});
});
