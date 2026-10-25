/**
 * XSUS AI Core — Language Knowledge Seed
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Sigurimi i të dhënave fillestare gjuhësore.
 * - Organizimi i njohurive në mënyrë të strukturuar.
 * - Mbështetja e shqipes dhe anglishtes.
 * - Përgatitja për zgjerim shumëgjuhësh.
 *
 * Ky modul nuk kryen vetë kërkim ose përkthim.
 * Ai ofron të dhëna për Language Knowledge Engine.
 *
 * Shënim:
 * Përkufizimet dhe përkthimet janë të dhëna fillestare
 * që mund të zgjerohen dhe verifikohen gradualisht.
 */

export const LANGUAGE_KNOWLEDGE_SEED_VERSION = "1.0.0";

export const LANGUAGE_KNOWLEDGE_SEED = Object.freeze([
  // =====================================================
  // SHQIP — SQ
  // =====================================================

  {
    id: "sq-greeting-001",
    language: "sq",
    lemma: "përshëndetje",
    type: "word",
    definitions: [
      "Shprehje që përdoret për të përshëndetur dikë."
    ],
    translations: {
      en: ["greeting", "hello"],
      fr: ["salutation", "bonjour"]
    },
    synonyms: ["tungjatjeta", "tung"],
    examples: [
      "Përshëndetje, si je?",
      "Ajo dha një përshëndetje të ngrohtë."
    ]
  },

  {
    id: "sq-greeting-002",
    language: "sq",
    lemma: "mirëmëngjes",
    type: "expression",
    definitions: [
      "Përshëndetje që përdoret gjatë orëve të mëngjesit."
    ],
    translations: {
      en: ["good morning"],
      fr: ["bonjour"]
    },
    synonyms: [],
    examples: [
      "Mirëmëngjes! Si po kalon?"
    ]
  },

  {
    id: "sq-greeting-003",
    language: "sq",
    lemma: "mirupafshim",
    type: "expression",
    definitions: [
      "Shprehje që përdoret kur njerëzit ndahen."
    ],
    translations: {
      en: ["goodbye", "see you"],
      fr: ["au revoir"]
    },
    synonyms: ["shihemi"],
    examples: [
      "Mirupafshim dhe kalofsh mirë!"
    ]
  },

  {
    id: "sq-greeting-004",
    language: "sq",
    lemma: "faleminderit",
    type: "word",
    definitions: [
      "Fjalë që shpreh mirënjohje për dikë ose për diçka."
    ],
    translations: {
      en: ["thank you", "thanks"],
      fr: ["merci"]
    },
    synonyms: [],
    examples: [
      "Faleminderit për ndihmën."
    ]
  },

  {
    id: "sq-greeting-005",
    language: "sq",
    lemma: "ju lutem",
    type: "expression",
    definitions: [
      "Shprehje që përdoret për të bërë një kërkesë me mirësjellje."
    ],
    translations: {
      en: ["please"],
      fr: ["s'il vous plaît"]
    },
    synonyms: [],
    examples: [
      "Ju lutem, më ndihmoni."
    ]
  },

  {
    id: "sq-general-001",
    language: "sq",
    lemma: "libër",
    type: "word",
    definitions: [
      "Vepër e shkruar ose e shtypur që përmban informacion, tregime ose ide."
    ],
    translations: {
      en: ["book"],
      fr: ["livre"]
    },
    synonyms: [],
    examples: [
      "Po lexoj një libër për historinë."
    ]
  },

  {
    id: "sq-general-002",
    language: "sq",
    lemma: "gjuhë",
    type: "word",
    definitions: [
      "Sistem shenjash dhe rregullash që njerëzit përdorin për të komunikuar."
    ],
    translations: {
      en: ["language"],
      fr: ["langue", "langage"]
    },
    synonyms: [],
    examples: [
      "Shqipja është gjuha ime e preferuar."
    ]
  },

  {
    id: "sq-general-003",
    language: "sq",
    lemma: "njohuri",
    type: "word",
    definitions: [
      "Informacion dhe kuptim që fitohet përmes mësimit, përvojës ose kërkimit."
    ],
    translations: {
      en: ["knowledge"],
      fr: ["connaissance", "savoir"]
    },
    synonyms: ["dituri"],
    examples: [
      "Njohuritë zhvillohen përmes studimit."
    ]
  },

  {
    id: "sq-general-004",
    language: "sq",
    lemma: "mësim",
    type: "word",
    definitions: [
      "Procesi i fitimit të njohurive ose i aftësive."
    ],
    translations: {
      en: ["learning", "lesson"],
      fr: ["apprentissage", "leçon"]
    },
    synonyms: [],
    examples: [
      "Mësimi i programimit kërkon praktikë."
    ]
  },

  {
    id: "sq-general-005",
    language: "sq",
    lemma: "pyetje",
    type: "word",
    definitions: [
      "Shprehje që përdoret për të kërkuar informacion ose sqarim."
    ],
    translations: {
      en: ["question"],
      fr: ["question"]
    },
    synonyms: [],
    examples: [
      "Kam një pyetje për këtë temë."
    ]
  },

  {
    id: "sq-general-006",
    language: "sq",
    lemma: "përgjigje",
    type: "word",
    definitions: [
      "Informacion që jepet si reagim ndaj një pyetjeje ose kërkese."
    ],
    translations: {
      en: ["answer", "response"],
      fr: ["réponse"]
    },
    synonyms: [],
    examples: [
      "Përgjigjja ishte e qartë."
    ]
  },

  {
    id: "sq-general-007",
    language: "sq",
    lemma: "ide",
    type: "word",
    definitions: [
      "Mendim ose koncept që formohet në mendje."
    ],
    translations: {
      en: ["idea"],
      fr: ["idée"]
    },
    synonyms: ["mendim", "koncept"],
    examples: [
      "Kam një ide për një projekt të ri."
    ]
  },

  {
    id: "sq-general-008",
    language: "sq",
    lemma: "punë",
    type: "word",
    definitions: [
      "Veprimtari që kryhet për të arritur një qëllim ose për të prodhuar diçka."
    ],
    translations: {
      en: ["work", "job"],
      fr: ["travail", "emploi"]
    },
    synonyms: [],
    examples: [
      "Puna kërkon përkushtim."
    ]
  },

  // =====================================================
  // PROGRAMIMI — SHQIP
  // =====================================================

  {
    id: "sq-programming-001",
    language: "sq",
    lemma: "programim",
    type: "concept",
    definitions: [
      "Procesi i krijimit të udhëzimeve që një kompjuter mund t'i ekzekutojë."
    ],
    translations: {
      en: ["programming"],
      fr: ["programmation"]
    },
    synonyms: [],
    examples: [
      "Programimi përdoret për të krijuar aplikacione."
    ]
  },

  {
    id: "sq-programming-002",
    language: "sq",
    lemma: "kod burimor",
    type: "concept",
    definitions: [
      "Teksti i shkruar në një gjuhë programimi që përshkruan veprimet e një programi."
    ],
    translations: {
      en: ["source code"],
      fr: ["code source"]
    },
    synonyms: [],
    examples: [
      "Zhvilluesi e kontrolloi kodin burimor."
    ]
  },

  {
    id: "sq-programming-003",
    language: "sq",
    lemma: "algoritëm",
    type: "concept",
    definitions: [
      "Grup i fundëm dhe i organizuar hapash për zgjidhjen e një problemi."
    ],
    translations: {
      en: ["algorithm"],
      fr: ["algorithme"]
    },
    synonyms: [],
    examples: [
      "Algoritmi përcakton hapat e zgjidhjes."
    ]
  },

  {
    id: "sq-programming-004",
    language: "sq",
    lemma: "variabël",
    type: "concept",
    definitions: [
      "Emër që përdoret për t'iu referuar një vlere në një program."
    ],
    translations: {
      en: ["variable"],
      fr: ["variable"]
    },
    synonyms: [],
    examples: [
      "Variabla ruan një vlerë që programi mund ta përdorë."
    ]
  },

  {
    id: "sq-programming-005",
    language: "sq",
    lemma: "funksion",
    type: "concept",
    definitions: [
      "Pjesë e emërtuar e një programi që kryen një detyrë dhe mund të marrë parametra."
    ],
    translations: {
      en: ["function"],
      fr: ["fonction"]
    },
    synonyms: [],
    examples: [
      "Funksioni përpunon të dhënat dhe kthen një rezultat."
    ]
  },

  {
    id: "sq-programming-006",
    language: "sq",
    lemma: "bazë të dhënash",
    type: "concept",
    definitions: [
      "Koleksion i organizuar të dhënash që mund të ruhen, kërkohen dhe përditësohen."
    ],
    translations: {
      en: ["database"],
      fr: ["base de données"]
    },
    synonyms: [],
    examples: [
      "Aplikacioni ruan përdoruesit në bazën e të dhënave."
    ]
  },

  // =====================================================
  // INTELIGJENCA ARTIFICIALE — SHQIP
  // =====================================================

  {
    id: "sq-ai-001",
    language: "sq",
    lemma: "inteligjencë artificiale",
    type: "concept",
    definitions: [
      "Fushë e informatikës që studion dhe zhvillon sisteme të afta të kryejnë detyra që zakonisht kërkojnë aftësi të lidhura me inteligjencën njerëzore."
    ],
    translations: {
      en: ["artificial intelligence", "AI"],
      fr: ["intelligence artificielle", "IA"]
    },
    synonyms: [],
    examples: [
      "Inteligjenca artificiale mund të përdoret për përpunimin e gjuhës."
    ]
  },

  {
    id: "sq-ai-002",
    language: "sq",
    lemma: "model gjuhësor",
    type: "concept",
    definitions: [
      "Model kompjuterik që përpunon ose gjeneron gjuhë duke përdorur modele të mësuara nga të dhënat."
    ],
    translations: {
      en: ["language model"],
      fr: ["modèle linguistique", "modèle de langage"]
    },
    synonyms: [],
    examples: [
      "Modeli gjuhësor mund të gjenerojë tekst."
    ]
  },

  {
    id: "sq-ai-003",
    language: "sq",
    lemma: "përpunim i gjuhës natyrore",
    type: "concept",
    definitions: [
      "Fushë që merret me përpunimin dhe analizimin kompjuterik të gjuhës së përdorur nga njerëzit."
    ],
    translations: {
      en: ["natural language processing", "NLP"],
      fr: ["traitement automatique du langage naturel", "TALN"]
    },
    synonyms: [],
    examples: [
      "Përpunimi i gjuhës natyrore ndihmon në analizimin e tekstit."
    ]
  },

  // =====================================================
  // ENGLISH — EN
  // =====================================================

  {
    id: "en-greeting-001",
    language: "en",
    lemma: "hello",
    type: "word",
    definitions: [
      "A word used to greet someone or begin a conversation."
    ],
    translations: {
      sq: ["përshëndetje", "tungjatjeta"],
      fr: ["bonjour", "salut"]
    },
    synonyms: ["hi"],
    examples: [
      "Hello, how are you?"
    ]
  },

  {
    id: "en-greeting-002",
    language: "en",
    lemma: "good morning",
    type: "expression",
    definitions: [
      "A greeting commonly used during the morning."
    ],
    translations: {
      sq: ["mirëmëngjes"],
      fr: ["bonjour"]
    },
    synonyms: [],
    examples: [
      "Good morning! How are you today?"
    ]
  },

  {
    id: "en-greeting-003",
    language: "en",
    lemma: "thank you",
    type: "expression",
    definitions: [
      "An expression used to show gratitude."
    ],
    translations: {
      sq: ["faleminderit"],
      fr: ["merci"]
    },
    synonyms: ["thanks"],
    examples: [
      "Thank you for your help."
    ]
  },

  {
    id: "en-general-001",
    language: "en",
    lemma: "language",
    type: "word",
    definitions: [
      "A system of communication using words, signs, or other structured symbols."
    ],
    translations: {
      sq: ["gjuhë"],
      fr: ["langue", "langage"]
    },
    synonyms: [],
    examples: [
      "Language allows people to communicate."
    ]
  },

  {
    id: "en-general-002",
    language: "en",
    lemma: "knowledge",
    type: "word",
    definitions: [
      "Information and understanding acquired through learning, experience, or study."
    ],
    translations: {
      sq: ["njohuri", "dituri"],
      fr: ["connaissance", "savoir"]
    },
    synonyms: [],
    examples: [
      "Knowledge can grow through study and experience."
    ]
  },

  {
    id: "en-general-003",
    language: "en",
    lemma: "question",
    type: "word",
    definitions: [
      "A request for information, clarification, or an answer."
    ],
    translations: {
      sq: ["pyetje"],
      fr: ["question"]
    },
    synonyms: [],
    examples: [
      "I have a question about programming."
    ]
  },

  {
    id: "en-general-004",
    language: "en",
    lemma: "answer",
    type: "word",
    definitions: [
      "A response to a question, request, or problem."
    ],
    translations: {
      sq: ["përgjigje"],
      fr: ["réponse"]
    },
    synonyms: ["response", "reply"],
    examples: [
      "The answer explains the main idea."
    ]
  },

  // =====================================================
  // PROGRAMMING — ENGLISH
  // =====================================================

  {
    id: "en-programming-001",
    language: "en",
    lemma: "programming",
    type: "concept",
    definitions: [
      "The process of creating instructions that a computer can execute."
    ],
    translations: {
      sq: ["programim"],
      fr: ["programmation"]
    },
    synonyms: [],
    examples: [
      "Programming is used to build software applications."
    ]
  },

  {
    id: "en-programming-002",
    language: "en",
    lemma: "source code",
    type: "concept",
    definitions: [
      "Text written in a programming language that describes a program's instructions."
    ],
    translations: {
      sq: ["kod burimor"],
      fr: ["code source"]
    },
    synonyms: [],
    examples: [
      "The developer reviewed the source code."
    ]
  },

  {
    id: "en-programming-003",
    language: "en",
    lemma: "algorithm",
    type: "concept",
    definitions: [
      "A finite, organized sequence of steps for solving a problem."
    ],
    translations: {
      sq: ["algoritëm"],
      fr: ["algorithme"]
    },
    synonyms: [],
    examples: [
      "The algorithm describes the steps needed to solve the problem."
    ]
  },

  {
    id: "en-programming-004",
    language: "en",
    lemma: "variable",
    type: "concept",
    definitions: [
      "A named reference used to access a value in a program."
    ],
    translations: {
      sq: ["variabël"],
      fr: ["variable"]
    },
    synonyms: [],
    examples: [
      "The variable stores a value used by the program."
    ]
  },

  {
    id: "en-programming-005",
    language: "en",
    lemma: "function",
    type: "concept",
    definitions: [
      "A named unit of program logic that performs a task and may accept parameters."
    ],
    translations: {
      sq: ["funksion"],
      fr: ["fonction"]
    },
    synonyms: [],
    examples: [
      "The function processes the input and returns a result."
    ]
  },

  {
    id: "en-programming-006",
    language: "en",
    lemma: "database",
    type: "concept",
    definitions: [
      "An organized collection of data that can be stored, queried, and updated."
    ],
    translations: {
      sq: ["bazë të dhënash"],
      fr: ["base de données"]
    },
    synonyms: [],
    examples: [
      "The application stores user records in a database."
    ]
  },

  // =====================================================
  // ARTIFICIAL INTELLIGENCE — ENGLISH
  // =====================================================

  {
    id: "en-ai-001",
    language: "en",
    lemma: "artificial intelligence",
    type: "concept",
    definitions: [
      "A field of computing that studies and develops systems capable of performing tasks associated with human intelligence."
    ],
    translations: {
      sq: ["inteligjencë artificiale"],
      fr: ["intelligence artificielle"]
    },
    synonyms: ["AI"],
    examples: [
      "Artificial intelligence can be used to process human language."
    ]
  },

  {
    id: "en-ai-002",
    language: "en",
    lemma: "language model",
    type: "concept",
    definitions: [
      "A computational model that processes or generates language using patterns learned from data."
    ],
    translations: {
      sq: ["model gjuhësor"],
      fr: ["modèle de langage"]
    },
    synonyms: [],
    examples: [
      "A language model can generate text."
    ]
  },

  {
    id: "en-ai-003",
    language: "en",
    lemma: "natural language processing",
    type: "concept",
    definitions: [
      "A field concerned with computational processing and analysis of human language."
    ],
    translations: {
      sq: ["përpunim i gjuhës natyrore"],
      fr: ["traitement automatique du langage naturel"]
    },
    synonyms: ["NLP"],
    examples: [
      "Natural language processing helps computers analyze text."
    ]
  }
]);

/**
 * Kthen kopje të të dhënave fillestare.
 *
 * Kjo shmang ndryshimet e drejtpërdrejta të koleksionit
 * të eksportuar nga modulet që e konsumojnë.
 */
export function getLanguageKnowledgeSeed() {
  return LANGUAGE_KNOWLEDGE_SEED.map((entry) => ({
    ...entry,
    definitions: [...entry.definitions],
    translations: Object.fromEntries(
      Object.entries(entry.translations).map(
        ([language, values]) => [
          language,
          [...values]
        ]
      )
    ),
    synonyms: [...entry.synonyms],
    examples: [...entry.examples]
  }));
}

/**
 * Kthen të dhënat fillestare për një gjuhë.
 *
 * @param {string} language - Kodi i gjuhës, p.sh. "sq" ose "en".
 * @returns {Array}
 */
export function getLanguageKnowledgeByLanguage(language) {
  if (typeof language !== "string") {
    return [];
  }

  const normalizedLanguage = language
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];

  return getLanguageKnowledgeSeed().filter(
    (entry) => entry.language === normalizedLanguage
  );
}

/**
 * Kthen statistikat e koleksionit fillestar.
 */
export function getLanguageKnowledgeSeedStats() {
  const entries = LANGUAGE_KNOWLEDGE_SEED;
  const languageCounts = {};

  for (const entry of entries) {
    languageCounts[entry.language] =
      (languageCounts[entry.language] || 0) + 1;
  }

  return {
    version: LANGUAGE_KNOWLEDGE_SEED_VERSION,
    totalEntries: entries.length,
    languageCounts: { ...languageCounts },
    languages: Object.keys(languageCounts)
  };
}
