import { describe, expect, test } from "vitest";

import {
createKnowledgeCollection,
createKnowledgeEntry
} from "../../src/knowledge/knowledge-entry.js";

describe("XSUS Knowledge Collection Integrity", () => {
const validEntry = (overrides = {}) => ({
id: "sq-general-001",
title: "Përshëndetje",
content: "Përshëndetje! Si mund të të ndihmoj?",
domain: "general",
language: "sq",
...overrides
});

test("krijon një koleksion të vlefshëm", () => {
const collection = createKnowledgeCollection([
validEntry(),
validEntry({
id: "en-general-001",
title: "Greeting",
content: "Hello! How can I help?",
language: "en"
})
]);

expect(collection).toHaveLength(2);
expect(Object.isFrozen(collection)).toBe(true);
expect(collection[0].id).toBe("sq-general-001");
expect(collection[1].language).toBe("en");

});

test("refuzon ID të përsëritura", () => {
expect(() =>
createKnowledgeCollection([
validEntry(),
validEntry({
title: "Titull tjetër"
})
])
).toThrow(/ID e përsëritur/u);
});

test("refuzon koleksion që nuk është varg", () => {
expect(() =>
createKnowledgeCollection({})
).toThrow("Koleksioni i njohurive duhet të jetë një varg.");
});

test("refuzon hyrje të pavlefshme brenda koleksionit", () => {
expect(() =>
createKnowledgeCollection([
validEntry(),
validEntry({
id: "",
title: "Pa ID"
})
])
).toThrow("Hyrja e njohurive duhet të ketë një ID.");
});

test("nuk lejon ndryshimin e koleksionit pas krijimit", () => {
const collection = createKnowledgeCollection([
validEntry()
]);

expect(() =>
  collection.push(validEntry({
    id: "sq-general-002"
  }))
).toThrow();

});

test("nuk lejon ndryshimin e hyrjeve të koleksionit", () => {
const collection = createKnowledgeCollection([
validEntry()
]);

expect(Object.isFrozen(collection[0])).toBe(true);

expect(() => {
  collection[0].title = "Titull i ndryshuar";
}).toThrow();

});

test("normalizon hyrjet para kontrollit të ID-ve", () => {
expect(() =>
createKnowledgeCollection([
validEntry({ id: "sq-general-001" }),
validEntry({ id: " sq-general-001 " })
])
).toThrow(/ID e përsëritur/u);
});

test("ruan versionin e skemës për çdo hyrje", () => {
const collection = createKnowledgeCollection([
validEntry()
]);

expect(collection[0].schemaVersion).toBe("1.3.0");

});

test("createKnowledgeEntry vazhdon të krijojë hyrje të pavarura", () => {
const entry = createKnowledgeEntry(validEntry());

expect(entry.id).toBe("sq-general-001");
expect(Object.isFrozen(entry)).toBe(true);
expect(Object.isFrozen(entry.keywords)).toBe(true);
expect(Object.isFrozen(entry.tags)).toBe(true);

});
});
