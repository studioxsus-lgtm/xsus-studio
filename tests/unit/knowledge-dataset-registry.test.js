import { describe, expect, test } from "vitest";

import {
createKnowledgeDatasetRegistry
} from "../../src/knowledge/knowledge-dataset-registry.js";

describe("XSUS Knowledge Dataset Registry", () => {
const validEntry = (overrides = {}) => ({
id: "sq-general-001",
title: "Përshëndetje",
content: "Përshëndetje! Si mund të të ndihmoj?",
domain: "general",
language: "sq",
...overrides
});

test("regjistron dataset të vlefshëm", () => {
const registry = createKnowledgeDatasetRegistry();

const result = registry.registerDataset(
  "sq-general",
  [validEntry()]
);

expect(result.success).toBe(true);
expect(result.datasetId).toBe("sq-general");
expect(result.dataset.entryCount).toBe(1);
expect(registry.getDataset("sq-general")).not.toBeNull();

});

test("refuzon dataset të pavlefshëm", () => {
const registry = createKnowledgeDatasetRegistry();

const result = registry.registerDataset(
  "invalid-data",
  [validEntry({ id: "" })]
);

expect(result.success).toBe(false);
expect(result.validationErrors.length).toBeGreaterThan(0);
expect(registry.getDataset("invalid-data")).toBeNull();

});

test("nuk lejon regjistrim të dyfishtë", () => {
const registry = createKnowledgeDatasetRegistry();

registry.registerDataset("sq-general", [validEntry()]);

const duplicate = registry.registerDataset(
  "sq-general",
  [validEntry({
    id: "sq-general-002",
    title: "Titull tjetër"
  })]
);

expect(duplicate.success).toBe(false);
expect(registry.getDataset("sq-general").entryCount).toBe(1);

});

test("refuzon ID të pavlefshme", () => {
const registry = createKnowledgeDatasetRegistry();

const result = registry.registerDataset(
  "../private",
  [validEntry()]
);

expect(result.success).toBe(false);
expect(registry.listDatasets()).toHaveLength(0);

});

test("liston metadata pa ekspozuar Map-in e brendshëm", () => {
const registry = createKnowledgeDatasetRegistry();

registry.registerDataset("sq-general", [validEntry()]);

const list = registry.listDatasets();

expect(list).toEqual([
  {
    id: "sq-general",
    entryCount: 1,
    schemaVersion: "1.3.0"
  }
]);

list.push({ id: "fake" });

expect(registry.listDatasets()).toHaveLength(1);

});

test("heq vetëm dataset-in e kërkuar", () => {
const registry = createKnowledgeDatasetRegistry();

registry.registerDataset("sq-general", [validEntry()]);
registry.registerDataset("en-general", [
  validEntry({
    id: "en-general-001",
    title: "Greeting",
    content: "Hello!",
    language: "en"
  })
]);

const result = registry.removeDataset("sq-general");

expect(result.success).toBe(true);
expect(result.removed).toBe(true);
expect(registry.getDataset("sq-general")).toBeNull();
expect(registry.getDataset("en-general")).not.toBeNull();

});

test("raporton kur dataset-i nuk ekziston", () => {
const registry = createKnowledgeDatasetRegistry();

const result = registry.removeDataset("missing");

expect(result.success).toBe(false);
expect(result.removed).toBe(false);

});

test("regjistrat janë të izoluar nga njëri-tjetri", () => {
const first = createKnowledgeDatasetRegistry();
const second = createKnowledgeDatasetRegistry();

first.registerDataset("sq-general", [validEntry()]);

expect(first.getDataset("sq-general")).not.toBeNull();
expect(second.getDataset("sq-general")).toBeNull();

});

test("ruan koleksionin e pandryshueshëm", () => {
const registry = createKnowledgeDatasetRegistry();

const result = registry.registerDataset(
  "sq-general",
  [validEntry()]
);

expect(Object.isFrozen(result.dataset)).toBe(true);
expect(Object.isFrozen(result.dataset.collection)).toBe(true);
expect(Object.isFrozen(result.dataset.collection[0])).toBe(true);

});

test("pranon dataset bosh sipas rregullit të validatorit", () => {
const registry = createKnowledgeDatasetRegistry();

const result = registry.registerDataset("empty-data", []);

expect(result.success).toBe(true);
expect(result.dataset.entryCount).toBe(0);

});
});
