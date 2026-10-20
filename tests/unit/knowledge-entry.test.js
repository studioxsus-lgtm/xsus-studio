
import { describe, expect, test } from "vitest";

import {
  createKnowledgeEntry,
  validateKnowledgeEntry,
  createKnowledgeCollection,
  KNOWLEDGE_SCHEMA_VERSION
} from "../../src/knowledge/knowledge-entry.js";

const validEntry = {
  id: "math-addition",
  title: "Mbledhja",
  content: "Mbledhja bashkon dy ose më shumë numra.",
  domain: "mathematics",
  topic: "arithmetic.addition",
  language: "sq",
  difficulty: "beginner",
  status: "reviewed",
  keywords: ["mbledhje", "numra"],
  tags: ["matematikë"],
  source: "xsus-knowledge"
};

describe("XSUS Knowledge Entry", () => {
  test("krijon një hyrje të vlefshme", () => {
    const entry = createKnowledgeEntry(validEntry);

    expect(entry.id).toBe("math-addition");
    expect(entry.domain).toBe("mathematics");
    expect(entry.language).toBe("sq");
    expect(entry.schemaVersion).toBe(KNOWLEDGE_SCHEMA_VERSION);
  });

  test("përdor vlerat e parazgjedhura", () => {
    const entry = createKnowledgeEntry({
      id: "general-1",
      title: "Njohuri të përgjithshme",
      content: "Kjo është një hyrje testimi."
    });

    expect(entry.domain).toBe("general");
    expect(entry.language).toBe("sq");
    expect(entry.difficulty).toBe("beginner");
    expect(entry.status).toBe("draft");
  });

  test("refuzon hyrjen pa ID", () => {
    expect(() =>
      createKnowledgeEntry({
        ...validEntry,
        id: ""
      })
    ).toThrow("ID");
  });

  test("refuzon përmbajtjen bosh", () => {
    expect(() =>
      createKnowledgeEntry({
        ...validEntry,
        content: " "
      })
    ).toThrow("përmbajtje");
  });

  test("refuzon fushën e panjohur", () => {
    expect(() =>
      createKnowledgeEntry({
        ...validEntry,
        domain: "unknown-domain"
      })
    ).toThrow("nuk njihet");
  });

  test("refuzon nivelin e pavlefshëm", () => {
    expect(() =>
      createKnowledgeEntry({
        ...validEntry,
        difficulty: "impossible"
      })
    ).toThrow("Niveli");
  });

  test("heq fjalët kyçe të përsëritura", () => {
    const entry = createKnowledgeEntry({
      ...validEntry,
      keywords: ["AI", "AI", "inteligjencë artificiale"]
    });

    expect(entry.keywords).toEqual([
      "AI",
      "inteligjencë artificiale"
    ]);
  });

  test("e shënon hyrjen e vlefshme si të vlefshme", () => {
    expect(validateKnowledgeEntry(validEntry)).toEqual({
      valid: true,
      errors: []
    });
  });

  test("kthen gabime për hyrjen e pavlefshme", () => {
    const result = validateKnowledgeEntry({
      title: "Pa ID",
      content: "Përmbajtje testimi."
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("krijon një koleksion njohurish", () => {
    const collection = createKnowledgeCollection([
      validEntry,
      {
        ...validEntry,
        id: "math-subtraction",
        title: "Zbritja"
      }
    ]);

    expect(collection).toHaveLength(2);
    expect(collection[1].id).toBe("math-subtraction");
  });

  test("refuzon ID të përsëritura në koleksion", () => {
    expect(() =>
      createKnowledgeCollection([
        validEntry,
        validEntry
      ])
    ).toThrow("ID e përsëritur");
  });

  test("nuk lejon ndryshimin e hyrjes së krijuar", () => {
    const entry = createKnowledgeEntry(validEntry);

    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(entry.keywords)).toBe(true);
  });
});
