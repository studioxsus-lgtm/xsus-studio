import { describe, expect, it } from "vitest";

import { analyzeNoun } from "../src/lib/language/noun-morphology";
import { analyzeVerb } from "../src/lib/language/verb-morphology";
import { parseAlbanianSentence } from "../src/lib/language/sentence-parser";
import { analyzeAlbanianGrammar } from "../src/lib/language/grammar-engine";

describe("XSUS Albanian Grammar Engine", () => {
  it("analizon një emër në shumës të shquar", () => {
    const result = analyzeNoun("librat");

    expect(result.lemma).toBe("libër");
    expect(result.analyses[0].number).toBe("plural");
    expect(result.analyses[0].definiteness).toBe("definite");
  });

  it("analizon një folje në kohën e tashme", () => {
    const result = analyzeVerb("punojmë");

    expect(result.lemma).toBe("punoj");
    expect(result.analyses[0].tense).toBe("present");
    expect(result.analyses[0].person).toBe(1);
    expect(result.analyses[0].number).toBe("plural");
  });

  it("ruan paqartësinë e formës së foljes", () => {
    const result = analyzeVerb("punon");

    expect(result.ambiguous).toBe(true);
    expect(result.analyses.length).toBeGreaterThan(1);
  });

  it("identifikon mohimin", () => {
    const result = parseAlbanianSentence(
      "Studenti nuk punon."
    );

    expect(result.hasNegation).toBe(true);
    expect(result.possibleVerbs).toContain("punoj");
  });

  it("kthen analizë të bashkuar", () => {
    const result = analyzeAlbanianGrammar(
      "Studenti punon."
    );

    expect(result.language).toBe("sq");
    expect(result.tokens.length).toBe(2);
    expect(result.syntax.possibleVerbs).toContain("punoj");
  });
});
