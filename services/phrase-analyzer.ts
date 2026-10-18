
import {
  ALBANIAN_PHRASE_PATTERNS,
  type AlbanianPhraseType,
} from "./phrase-patterns";

export interface AlbanianPhraseMatch {
  id: string;
  text: string;
  start: number;
  end: number;
  type: AlbanianPhraseType;
  tense: "present_perfect" | "future" | "aorist" | "unknown";
  description: {
    sq: string;
    en: string;
  };
  confidence: number;
}

export function analyzeAlbanianPhrases(
  input: string,
): AlbanianPhraseMatch[] {
  if (!input.trim()) return [];

  const matches: AlbanianPhraseMatch[] = [];

  for (const definition of ALBANIAN_PHRASE_PATTERNS) {
    // Krijojmë RegExp të ri që gjendja lastIndex
    // të mos ndikojë te thirrjet e mëvonshme.
    const regex = new RegExp(
      definition.pattern.source,
      definition.pattern.flags,
    );

    for (const match of input.matchAll(regex)) {
      const text = match[0];
      const start = match.index;

      if (start === undefined) continue;

      matches.push({
        id: definition.id,
        text,
        start,
        end: start + text.length,
        type: definition.type,
        tense: definition.tense,
        description: definition.description,
        confidence:
          definition.type === "negative_perfect" ||
          definition.type === "future"
            ? 0.9
            : 0.75,
      });
    }
  }

  // Përparësi modeleve specifike dhe shprehjeve më të gjata.
  matches.sort(
    (a, b) =>
      b.confidence - a.confidence ||
      (b.end - b.start) - (a.end - a.start) ||
      a.start - b.start,
  );

  const accepted: AlbanianPhraseMatch[] = [];

  for (const candidate of matches) {
    const overlaps = accepted.some(
      (existing) =>
        candidate.start < existing.end &&
        candidate.end > existing.start,
    );

    if (!overlaps) accepted.push(candidate);
  }

  return accepted.sort((a, b) => a.start - b.start);
}
