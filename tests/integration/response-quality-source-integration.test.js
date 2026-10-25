import { describe, expect, test } from "vitest";

import {
  evaluateResponseQuality,
  RESPONSE_QUALITY_VERSION
} from "../../src/core/response-quality-engine.js";

import {
  verifyResponseSource,
  verifyResponseSources,
  SOURCE_VERIFICATION_STATUSES
} from "../../src/core/response-source-verifier.js";

describe("XSUS AI Core — Response Quality and Source Integration", () => {
  const baseInput = {
    query: "What is artificial intelligence?",
    answer:
      "Artificial intelligence is a field of computer science that develops systems capable of performing tasks associated with human intelligence.",
    requestedLanguage: "en",
    responseLanguage: "en"
  };

  test("përdor versionin e pritur të Response Quality Engine", () => {
    const result = evaluateResponseQuality(baseInput);

    expect(RESPONSE_QUALITY_VERSION).toBe("1.0.0");
    expect(result.version).toBe("1.0.0");
    expect(result).toHaveProperty("dimensions");
    expect(result).toHaveProperty("sourceCount");
    expect(result).toHaveProperty("errors");
  });

  test("ruan pikëzimin ekzistues kur burimi nuk ka URL", () => {
    const result = evaluateResponseQuality({
      ...baseInput,
      sources: [
        {
          id: "source-1",
          title: "AI Introduction",
          content: "An introduction to artificial intelligence."
        }
      ]
    });

    const sourceVerification = verifyResponseSource({
      id: "source-1",
      title: "AI Introduction",
      content: "An introduction to artificial intelligence."
    });

    expect(result.sourceCount).toBe(1);
    expect(result.dimensions.sources).toBe(100);

    // Prania e burimit nuk do të thotë se ai është verifikuar.
    expect(sourceVerification.verified).toBe(false);
    expect(sourceVerification.trustEstablished).toBe(false);
  });

  test("verifikuesi dallon burimet strukturalisht të vlefshme", () => {
    const source = {
      title: "AI Research",
      content: "Research about artificial intelligence.",
      url: "https://example.com/ai-research"
    };

    const verification = verifyResponseSource(source);

    expect(verification.status).toBe(
      SOURCE_VERIFICATION_STATUSES.STRUCTURALLY_VALID
    );
    expect(verification.valid).toBe(true);

    // Validiteti strukturor nuk provon besueshmërinë faktike.
    expect(verification.verified).toBe(false);
    expect(verification.trustEstablished).toBe(false);
  });

  test("dallon URL-në e pavlefshme nga pikëzimi i pranisë së burimit", () => {
    const source = {
      title: "AI Research",
      content: "Research about artificial intelligence.",
      url: "not-a-valid-url"
    };

    const verification = verifyResponseSource(source);

    const quality = evaluateResponseQuality({
      ...baseInput,
      sources: [source]
    });

    expect(verification.valid).toBe(false);
    expect(verification.verified).toBe(false);
    expect(verification.trustEstablished).toBe(false);

    // Ruhet kontrata ekzistuese e pikëzimit.
    expect(quality.sourceCount).toBe(1);
    expect(quality.dimensions.sources).toBe(100);
  });

  test("përpunon disa burime pa i konsideruar automatikisht të verifikuara", () => {
    const sources = [
      {
        title: "AI Source One",
        content: "First source content.",
        url: "https://example.com/one"
      },
      {
        title: "AI Source Two",
        content: "Second source content.",
        url: "invalid-url"
      }
    ];

    const verification = verifyResponseSources(sources);

    expect(verification).toHaveProperty("results");
    expect(verification.results).toHaveLength(2);
    expect(verification.verifiedCount).toBe(0);
    expect(verification.trustEstablishedCount).toBe(0);

    for (const result of verification.results) {
      expect(result.verified).toBe(false);
      expect(result.trustEstablished).toBe(false);
    }
  });

  test("burimet bosh nuk numërohen në vlerësimin e cilësisë", () => {
    const result = evaluateResponseQuality({
      ...baseInput,
      sources: ["", "   ", null, {}, 42]
    });

    expect(result.sourceCount).toBe(0);
    expect(result.dimensions.sources).toBe(50);
  });

  test("dështimi i verifikimit nuk ndryshon strukturën publike", () => {
    const result = evaluateResponseQuality({
      ...baseInput,
      sources: [
        {
          title: "AI Source",
          content: "Artificial intelligence overview.",
          url: "https://example.com/ai"
        }
      ]
    });

    expect(Object.keys(result)).toEqual([
      "version",
      "valid",
      "score",
      "dimensions",
      "sourceCount",
      "languageVerification",
      "errors"
    ]);

    expect(Object.keys(result.dimensions)).toEqual([
      "completeness",
      "clarity",
      "language",
      "sources"
    ]);
  });
});
