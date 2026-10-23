import { describe, expect, test } from "vitest";

import {
validateKnowledgeDataset
} from "../../src/knowledge/knowledge-dataset-validator.js";

describe("XSUS Knowledge Dataset Validator", () => {
const validEntry = (overrides = {}) => ({
id: "sq-general-001",
title: "Përshëndetje",
content: "Përshëndetje! Si mund të të ndihmoj?",
domain: "general",
language: "sq",
...overrides
});

test("pranon një dataset të vlefshëm", () => {
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
expect(result.errors).toEqual([]);
expect(result.collection).toHaveLength(2);
expect(result.metadata.totalEntries).toBe(2);
expect(result.metadata.invalidEntries).toBe(0);

});

test("refuzon dataset që nuk është varg", () => {
const result = validateKnowledgeDataset({});

expect(result.valid).toBe(false);
expect(result.collection).toBeNull();
expect(result.errors.length).toBeGreaterThan(0);

});

test("refuzon hyrje me ID të përsëritura", () => {
const result = validateKnowledgeDataset([
validEntry(),
validEntry({
id: " sq-general-001 "
})
]);

expect(result.valid).toBe(false);
expect(result.collection).toBeNull();
expect(result.errors.some(
  error => error.message.includes("ID e përsëritur")
)).toBe(true);

});

test("raporton më shumë se një hyrje të pavlefshme", () => {
const result = validateKnowledgeDataset([
validEntry(),
validEntry({
id: "",
title: "Pa ID"
}),
validEntry({
id: "sq-general-003",
title: "",
content: "Përmbajtje"
})
]);

expect(result.valid).toBe(false);
expect(result.collection).toBeNull();
expect(result.errors.length).toBeGreaterThanOrEqual(2);
expect(result.metadata.totalEntries).toBe(3);
expect(result.metadata.invalidEntries).toBe(2);

});

test("refuzon hyrje që nuk janë objekte të thjeshta", () => {
const result = validateKnowledgeDataset([
validEntry(),
null
]);

expect(result.valid).toBe(false);
expect(result.collection).toBeNull();
expect(result.errors.some(
  error => error.index === 1
)).toBe(true);

});

test("ruan versionet e motorit dhe skemës", () => {
const result = validateKnowledgeDataset([
validEntry()
]);

expect(result.metadata.engine)
  .toBe("xsus-knowledge-dataset-validator");

expect(result.metadata.version).toBe("1.0.0");
expect(result.metadata.schemaVersion).toBe("1.3.0");

});

test("kthen koleksion të pandryshueshëm kur dataset-i është i vlefshëm", () => {
const result = validateKnowledgeDataset([
validEntry()
]);

expect(Object.isFrozen(result.collection)).toBe(true);
expect(Object.isFrozen(result.collection[0])).toBe(true);

});

test("dataset-i bosh është i vlefshëm", () => {
const result = validateKnowledgeDataset([]);

expect(result.valid).toBe(true);
expect(result.collection).toEqual([]);
expect(result.metadata.totalEntries).toBe(0);

});
});
