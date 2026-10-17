// verb-morphology.ts

export type VerbTense =
  | "present"
  | "imperfect"
  | "aorist"
  | "perfect"
  | "unknown";

export type Person = 1 | 2 | 3;

export interface VerbForm {
  form: string;
  tense: VerbTense;
  person: Person | null;
  number: "singular" | "plural" | "unknown";
}

interface VerbEntry {
  lemma: string;
  forms: VerbForm[];
}

const VERBS: VerbEntry[] = [
  {
    lemma: "punoj",
    forms: [
      { form: "punoj", tense: "present", person: 1, number: "singular" },
      { form: "punon", tense: "present", person: 2, number: "singular" },
      { form: "punon", tense: "present", person: 3, number: "singular" },
      { form: "punojmë", tense: "present", person: 1, number: "plural" },
      { form: "punoni", tense: "present", person: 2, number: "plural" },
      { form: "punojnë", tense: "present", person: 3, number: "plural" },
      { form: "punoja", tense: "imperfect", person: 1, number: "singular" },
      { form: "punonte", tense: "imperfect", person: 3, number: "singular" },
      { form: "punuam", tense: "aorist", person: 1, number: "plural" },
      { form: "punova", tense: "aorist", person: 1, number: "singular" },
      { form: "punuar", tense: "unknown", person: null, number: "unknown" },
    ],
  },
  {
    lemma: "mësoj",
    forms: [
      { form: "mësoj", tense: "present", person: 1, number: "singular" },
      { form: "mëson", tense: "present", person: 2, number: "singular" },
      { form: "mëson", tense: "present", person: 3, number: "singular" },
      { form: "mësojmë", tense: "present", person: 1, number: "plural" },
      { form: "mësoni", tense: "present", person: 2, number: "plural" },
      { form: "mësojnë", tense: "present", person: 3, number: "plural" },
      { form: "mësova", tense: "aorist", person: 1, number: "singular" },
      { form: "mësoi", tense: "aorist", person: 3, number: "singular" },
      { form: "mësuar", tense: "unknown", person: null, number: "unknown" },
    ],
  },
  {
    lemma: "shkruaj",
    forms: [
      { form: "shkruaj", tense: "present", person: 1, number: "singular" },
      { form: "shkruan", tense: "present", person: 2, number: "singular" },
      { form: "shkruan", tense: "present", person: 3, number: "singular" },
      { form: "shkruajmë", tense: "present", person: 1, number: "plural" },
      { form: "shkruani", tense: "present", person: 2, number: "plural" },
      { form: "shkruajnë", tense: "present", person: 3, number: "plural" },
      { form: "shkrova", tense: "aorist", person: 1, number: "singular" },
      { form: "shkroi", tense: "aorist", person: 3, number: "singular" },
      { form: "shkruar", tense: "unknown", person: null, number: "unknown" },
    ],
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("sq-AL")
    .trim();
}

export interface VerbAnalysis {
  surface: string;
  lemma: string | null;
  analyses: VerbForm[];
  ambiguous: boolean;
  confidence: number;
}

export function analyzeVerb(input: string): VerbAnalysis {
  const surface = normalize(input);
  const matches: Array<{
    lemma: string;
    form: VerbForm;
  }> = [];

  for (const verb of VERBS) {
    for (const form of verb.forms) {
      if (normalize(form.form) === surface) {
        matches.push({
          lemma: verb.lemma,
          form,
        });
      }
    }
  }

  if (matches.length === 0) {
    return {
      surface,
      lemma: null,
      analyses: [],
      ambiguous: false,
      confidence: 0,
    };
  }

  const unique = new Map<string, {
    lemma: string;
    form: VerbForm;
  }>();

  for (const match of matches) {
    unique.set(
      `${match.lemma}|${match.form.tense}|${match.form.person}|${match.form.number}`,
      match
    );
  }

  const results = [...unique.values()];

  return {
    surface,
    lemma: results[0].lemma,
    analyses: results.map((item) => item.form),
    ambiguous: results.length > 1,
    confidence: results.length === 1 ? 0.99 : 0.65,
  };
}
