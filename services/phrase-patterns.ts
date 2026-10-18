
export type AlbanianPhraseType =
  | "perfect"
  | "future"
  | "negative_perfect"
  | "dative_clitic_construction";

export interface AlbanianPhrasePattern {
  id: string;
  type: AlbanianPhraseType;
  pattern: RegExp;
  description: {
    sq: string;
    en: string;
  };
  tense: "present_perfect" | "future" | "aorist" | "unknown";
  priority: number;
}

export const ALBANIAN_PHRASE_PATTERNS: AlbanianPhrasePattern[] = [
  {
    id: "negative-perfect",
    type: "negative_perfect",
    pattern:
      /\bnuk\s+(?:e|i|u|më|të|na|ju|mi|ia|ua)?\s*(?:kam|ke|ka|kemi|keni|kanë)\s+[\p{L}\p{M}]+\b/giu,
    description: {
      sq: "Formë foljore e përbërë me mohim",
      en: "Negative compound verb form",
    },
    tense: "present_perfect",
    priority: 100,
  },
  {
    id: "future-do-te",
    type: "future",
    pattern:
      /\bdo\s+të\s+[\p{L}\p{M}]+\b/giu,
    description: {
      sq: "Ndërtim i kohës së ardhme",
      en: "Future construction",
    },
    tense: "future",
    priority: 90,
  },
  {
    id: "perfect-kam",
    type: "perfect",
    pattern:
      /\b(?:kam|ke|ka|kemi|keni|kanë)\s+[\p{L}\p{M}]+\b/giu,
    description: {
      sq: "Formë foljore e përbërë me kam",
      en: "Compound verb form with kam",
    },
    tense: "present_perfect",
    priority: 80,
  },
  {
    id: "dative-clitic-aorist",
    type: "dative_clitic_construction",
    pattern:
      /\b(?:ia|ua|ma|ta|na|ju|mi|t'i|m'i)\s+[\p{L}\p{M}]+\b/giu,
    description: {
      sq: "Ndërtim me përemër të shkurtër dhe folje",
      en: "Clitic pronoun and verb construction",
    },
    tense: "aorist",
    priority: 70,
  },
];
