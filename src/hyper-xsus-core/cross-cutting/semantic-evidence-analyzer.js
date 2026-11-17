/** Deterministic semantic evidence overlap, not a language model or truth verifier. */
import { createUnicodeTokenizationEngine } from "./unicode-tokenization-engine.js";
export const SEMANTIC_EVIDENCE_VERSION = "1.0.0";
export function createSemanticEvidenceAnalyzer({ maxCodePoints = 4096, maxEvidence = 32 } = {}) {
  if (!Number.isSafeInteger(maxEvidence) || maxEvidence < 1 || maxEvidence > 256)
    throw new TypeError("Invalid semantic evidence configuration.");
  const tokenizer = createUnicodeTokenizationEngine({ maxCodePoints });
  const terms = text => new Set(tokenizer.tokenize(text).tokens
    .filter(t => t.kind === "word" || t.kind === "number").map(t => t.value.toLocaleLowerCase("und")));
  function analyze({ query, evidence = [] } = {}) {
    if (!Array.isArray(evidence) || evidence.length > maxEvidence)
      throw new TypeError("Invalid semantic evidence list.");
    const q = terms(query);
    if (!q.size) throw new TypeError("Semantic query requires lexical terms.");
    const ids = new Set();
    const ranked = Array.from({ length: evidence.length }, (_, index) => {
      const entry = Object.getOwnPropertyDescriptor(evidence, String(index));
      if (!entry || !Object.hasOwn(entry, "value"))
        throw new TypeError("Invalid semantic evidence entry.");
      const item = entry.value;
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          (Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null))
        throw new TypeError("Invalid semantic evidence entry.");
      const idField = Object.getOwnPropertyDescriptor(item, "id");
      const textField = Object.getOwnPropertyDescriptor(item, "text");
      if (!idField || !Object.hasOwn(idField, "value") ||
          !textField || !Object.hasOwn(textField, "value"))
        throw new TypeError("Invalid semantic evidence entry.");
      const id = idField.value;
      if (typeof id !== "string" || !/^[\w.:-]{1,128}$/.test(id) ||
          ids.has(id)) throw new TypeError("Invalid semantic evidence identifier.");
      ids.add(id);
      const words = terms(textField.value);
      const matched = [...q].filter(term => words.has(term)).sort();
      return Object.freeze({ id, score: matched.length / q.size,
        matchedTerms: Object.freeze(matched) });
    }).sort((a,b) => b.score - a.score || a.id.localeCompare(b.id));
    return Object.freeze({ version: SEMANTIC_EVIDENCE_VERSION,
      ranked: Object.freeze(ranked), method: "lexical-overlap", semanticTruthVerified: false });
  }
  return Object.freeze({ version: SEMANTIC_EVIDENCE_VERSION, analyze });
}
