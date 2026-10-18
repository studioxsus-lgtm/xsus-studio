import { describe, expect, it } from "vitest";

// Importet nga motori leksikor dhe gjuhësor
import { analyzeAlbanianWord } from "../src/lib/language/morphology";
import { analyzeAlbanianSentence } from "../src/lib/language/grammar-rules";
import { analyzeAlbanian } from "../src/lib/language/analyze-albanian";

// Importet nga motori gramatikor dhe morfologjik
import { analyzeNoun } from "../src/lib/language/noun-morphology";
import { analyzeVerb } from "../src/lib/language/verb-morphology";
import { parseAlbanianSentence } from "../src/lib/language/sentence-parser";
import { analyzeAlbanianGrammar } from "../src/lib/language/grammar-engine";

describe("XSUS Albanian Language Engine", () => {
  it("normalizon shkronjat Unicode", () => {
    const result = analyzeAlbanianSentence("  Çfarë   është AI?  ");

    expect(result.normalizedText).toBe("Çfarë është AI?");
  });

  it("identifikon një formë të njohur të fjalës", () => {
    const result = analyzeAlbanianWord("Librat");

    expect(result.known).toBe(true);
    expect(result.lemma).toBe("libër");
    expect(result.partOfSpeech).toBe("noun");
  });

  it("nuk shpik rrënjë për fjalë të panjohura", () => {
    const result = analyzeAlbanianWord("xyzabc");

    expect(result.known).toBe(false);
    expect(result.lemma).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("identifikon pyetjet", () => {
    const result = analyzeAlbanianSentence("Pse nuk funksionon?");

    expect(result.sentenceType).toBe("question");
    expect(result.hasNegation).toBe(true);
    expect(result.hasQuestionWord).toBe(true);
  });

  it("identifikon shprehjet e mirësjelljes", () => {
    const result = analyzeAlbanianSentence("Ju lutem, më ndihmo.");

    expect(result.hasPolitenessMarker).toBe(true);
    expect(result.hasRequestMarker).toBe(true);
  });

  it("llogarit mbulimin e fjalorit", () => {
    const result = analyzeAlbanian("Studentët lexojnë libra.");

    expect(result.language).toBe("sq");
    expect(result.statistics.totalWords).toBe(3);
    expect(result.statistics.vocabularyCoverage).toBeGreaterThan(0);
    expect(result.statistics.vocabularyCoverage).toBeLessThan(1);
  });
});

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
    const result = parseAlbanianSentence("Studenti nuk punon.");

    expect(result.hasNegation).toBe(true);
    expect(result.possibleVerbs).toContain("punoj");
  });

  it("kthen analizë të bashkuar", () => {
    const result = analyzeAlbanianGrammar("Studenti punon.");

    expect(result.language).toBe("sq");
    expect(result.tokens.length).toBe(2);
    expect(result.syntax.possibleVerbs).toContain("punoj");
  });
});
