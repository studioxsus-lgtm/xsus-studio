
import { describe, expect, test } from "vitest";

import {
  listKnowledgeDomains,
  getKnowledgeDomain,
  hasKnowledgeDomain,
  registerKnowledgeDomain
} from "../../src/knowledge/knowledge-domain-registry.js";

describe("XSUS Knowledge Domain Registry", () => {
  test("liston fushat bazë", () => {
    expect(listKnowledgeDomains().length).toBeGreaterThanOrEqual(13);
  });

  test("gjen fushën programming", () => {
    expect(getKnowledgeDomain("programming")?.name.sq)
      .toBe("Programim");
  });

  test("pranon shkronja të mëdha në kërkim", () => {
    expect(hasKnowledgeDomain("PROGRAMMING")).toBe(true);
  });

  test("kthen null për fushë që nuk ekziston", () => {
    expect(getKnowledgeDomain("unknown-domain")).toBeNull();
  });

  test("regjistron dhe heq një fushë shtesë", () => {
    const remove = registerKnowledgeDomain({
      id: "test-domain",
      name: { sq: "Fushë prove", en: "Test domain" },
      description: "Fushë për testim."
    });

    try {
      expect(hasKnowledgeDomain("test-domain")).toBe(true);
      expect(getKnowledgeDomain("test-domain").name.en)
        .toBe("Test domain");
    } finally {
      remove();
    }

    expect(hasKnowledgeDomain("test-domain")).toBe(false);
  });

  test("nuk lejon ID të përsëritura", () => {
    expect(() => registerKnowledgeDomain({
      id: "programming",
      name: { sq: "Programim", en: "Programming" }
    })).toThrow();
  });

  test("nuk lejon fusha pa emra të vlefshëm", () => {
    expect(() => registerKnowledgeDomain({
      id: "invalid-domain",
      name: { sq: "Fushë" }
    })).toThrow();
  });

  test("lista nuk ndryshon regjistrin e brendshëm", () => {
    const domains = listKnowledgeDomains();
    domains.pop();

    expect(hasKnowledgeDomain("programming")).toBe(true);
  });
});
