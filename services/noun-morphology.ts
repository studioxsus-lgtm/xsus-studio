// src/lib/language/noun-morphology.ts

export type AlbanianCase =
  | "nominative"   // emërore
  | "genitive"     // gjinore
  | "dative"       // dhanore
  | "accusative"   // kallëzore
  | "ablative"     // rrjedhore
  | "unknown";

export type GrammaticalNumber = "singular" | "plural" | "unknown";
export type Definiteness = "definite" | "indefinite" | "unknown";

export interface NounForm {
  form: string;
  grammaticalCase: AlbanianCase;
  number: GrammaticalNumber;
  definiteness: Definiteness;
}

export interface NounEntry {
  lemma: string;
  gender: "masculine" | "feminine" | "neuter" | "unknown";
  forms: NounForm[];
}

function normalize(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("sq-AL")
    .trim()
    .replace(/\s+/g, " ");
}

const NOUNS: NounEntry[] = [
  {
    lemma: "libër",
    gender: "masculine",
    forms: [
      { form: "libër", grammaticalCase: "nominative", number: "singular", definiteness: "indefinite" },
      { form: "libri", grammaticalCase: "nominative", number: "singular", definiteness: "definite" },
      { form: "librin", grammaticalCase: "accusative", number: "singular", definiteness: "definite" },
      { form: "libra", grammaticalCase: "nominative", number: "plural", definiteness: "indefinite" },
      { form: "librat", grammaticalCase: "nominative", number: "plural", definiteness: "definite" },
      { form: "librave", grammaticalCase: "dative", number: "plural", definiteness: "definite" },
      { form: "librash", grammaticalCase: "ablative", number: "plural", definiteness: "indefinite" },
      { form: "libri i", grammaticalCase: "genitive", number: "singular", definiteness: "definite" },
    ],
  },
  {
    lemma: "shkollë",
    gender: "feminine",
    forms: [
      { form: "shkollë", grammaticalCase: "nominative", number: "singular", definiteness: "indefinite" },
      { form: "shkolla", grammaticalCase: "nominative", number: "singular", definiteness: "definite" },
      { form: "shkollat", grammaticalCase: "nominative", number: "plural", definiteness: "definite" },
      { form: "shkolle", grammaticalCase: "ablative", number: "singular", definiteness: "indefinite" },
      { form: "shkollës", grammaticalCase: "dative", number: "singular", definiteness: "definite" },
      { form: "shkollave", grammaticalCase: "dative", number: "plural", definiteness: "definite" },
    ],
  },
  {
    lemma: "student",
    gender: "masculine",
    forms: [
      { form: "student", grammaticalCase: "nominative", number: "singular", definiteness: "indefinite" },
      { form: "studenti", grammaticalCase: "nominative", number: "singular", definiteness: "definite" },
      { form: "studentin", grammaticalCase: "accusative", number: "singular", definiteness: "definite" },
      { form: "studentë", grammaticalCase: "nominative", number: "plural", definiteness: "indefinite" },
      { form: "studentët", grammaticalCase: "nominative", number: "plural", definiteness: "definite" },
      { form: "studentit", grammaticalCase: "dative", number: "singular", definiteness: "definite" },
      { form: "studentëve", grammaticalCase: "dative", number: "plural", definiteness: "definite" },
    ],
  },
  {
    lemma: "shtëpi",
    gender: "feminine",
    forms: [
      { form: "shtëpi", grammaticalCase: "nominative", number: "singular", definiteness: "indefinite" },
      { form: "shtëpia", grammaticalCase: "nominative", number: "singular", definiteness: "definite" },
      { form: "shtëpitë", grammaticalCase: "nominative", number: "plural", definiteness: "definite" },
      { form: "shtëpisë", grammaticalCase: "dative", number: "singular", definiteness: "definite" },
      { form: "shtëpive", grammaticalCase: "dative", number: "plural", definiteness: "definite" },
      { form: "shtëpit", grammaticalCase: "nominative", number: "plural", definiteness: "definite" },
    ],
  },
];

const nounIndex = new Map<string, NounEntry[]>();

for (const noun of NOUNS) {
  for (const form of noun.forms) {
    const key = normalize(form.form);
    const existing = nounIndex.get(key) ?? [];
    existing.push(noun);
    nounIndex.set(key, existing);
  }
}

export interface NounAnalysis {
  surface: string;
  lemma: string | null;
  gender: NounEntry["gender"];
  analyses: NounForm[];
  ambiguous: boolean;
  confidence: number;
}

export function analyzeNoun(input: string): NounAnalysis {
  const surface = normalize(input);
  const candidates = nounIndex.get(surface) ?? [];

  if (candidates.length === 0) {
    return {
      surface,
      lemma: null,
      gender: "unknown",
      analyses: [],
      ambiguous: false,
      confidence: 0,
    };
  }

  const unique = new Map<string, {
    noun: NounEntry;
    form: NounForm;
  }>();

  for (const noun of candidates) {
    for (const form of noun.forms) {
      if (normalize(form.form) !== surface) continue;

      const key = [
        noun.lemma,
        form.grammaticalCase,
        form.number,
        form.definiteness,
      ].join("|");

      unique.set(key, { noun, form });
    }
  }

  const matches = [...unique.values()];
  const first = matches[0];

  return {
    surface,
    lemma: first.noun.lemma,
    gender: first.noun.gender,
    analyses: matches.map(({ form }) => form),
    ambiguous: matches.length > 1,
    confidence: matches.length === 1 ? 0.99 : 0.65,
  };
}
