// services/albanian-lexicon.ts

export interface AlbanianLexiconEntry {
  lemma: string;
  forms: string[];
  partOfSpeech:
    | "noun"
    | "verb"
    | "adjective"
    | "adverb"
    | "pronoun"
    | "other";
  meaning?: string;
}

const entries: AlbanianLexiconEntry[] = [
  {
    lemma: "libër",
    forms: [
      "libër", "libri", "libra", "librat",
      "libri i", "librave", "librash",
    ],
    partOfSpeech: "noun",
    meaning: "Një vepër e shkruar ose e shtypur.",
  },
  {
    lemma: "shkollë",
    forms: [
      "shkollë", "shkolla", "shkollat",
      "shkolle", "shkollës", "shkollave",
    ],
    partOfSpeech: "noun",
    meaning: "Institucion për arsimim.",
  },
  {
    lemma: "student",
    forms: [
      "student", "studenti", "studentë",
      "studentët", "studentit", "studentëve",
    ],
    partOfSpeech: "noun",
    meaning: "Person që ndjek studimet.",
  },
  {
    lemma: "shtëpi",
    forms: [
      "shtëpi", "shtëpia", "shtëpitë",
      "shtëpisë", "shtëpive", "shtëpi", "shtëpit",
    ],
    partOfSpeech: "noun",
    meaning: "Ndërtesë që përdoret për banim.",
  },
  {
    lemma: "punoj",
    forms: [
      "punoj", "punon", "punonim",
      "punuam", "punova", "punojnë",
      "punuar", "punonte",
    ],
    partOfSpeech: "verb",
    meaning: "Kryej një punë ose veprim.",
  },
  {
    lemma: "mësoj",
    forms: [
      "mësoj", "mëson", "mësojmë",
      "mësova", "mësoi", "mësojnë",
      "mësuar", "mësonte",
    ],
    partOfSpeech: "verb",
    meaning: "Marr njohuri ose aftësi.",
  },
  {
    lemma: "i mirë",
    forms: [
      "i mirë", "e mirë", "të mirë",
      "të mira", "mirë",
    ],
    partOfSpeech: "adjective",
    meaning: "Që ka cilësi pozitive.",
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("sq-AL")
    .trim()
    .replace(/\s+/g, " ");
}

export const ALBANIAN_LEXICON: ReadonlyArray<
  AlbanianLexiconEntry
> = entries.map((entry) => ({
  ...entry,
  forms: [...new Set(entry.forms.map(normalize))],
}));

const formIndex = new Map<
  string,
  AlbanianLexiconEntry
>();

for (const entry of ALBANIAN_LEXICON) {
  formIndex.set(normalize(entry.lemma), entry);

  for (const form of entry.forms) {
    // Në rast paqartësie, forma e parë e regjistruar fiton.
    if (!formIndex.has(form)) {
      formIndex.set(form, entry);
    }
  }
}

export function lookupAlbanianForm(
  word: string
): AlbanianLexiconEntry | undefined {
  return formIndex.get(normalize(word));
}
