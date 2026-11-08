
/**
 * XSUS AI V3 — Interface Language System
 * Version: 3.1.0
 * Brand: THE X IDENTITY
 *
 * Supported languages: sq, en, fr
 *
 * Independent of XSUS AI Core.
 */

export const LANGUAGE_VERSION = "3.1.0";

export const SUPPORTED_UI_LANGUAGES = Object.freeze([
  "sq",
  "en",
  "fr"
]);

export const DEFAULT_UI_LANGUAGE = "en";

const STORAGE_KEY = "xsus-ai-v3-language";

export const LANGUAGE_NAMES = Object.freeze({
  sq: "Shqip",
  en: "English",
  fr: "Français"
});

export const UI_TRANSLATIONS = Object.freeze({
  sq: {
    brand: "XSUS AI",
    slogan: "THE X IDENTITY",

    navigation: {
      chat: "Biseda",
      history: "Historiku",
      projects: "Projektet",
      knowledge: "Njohuritë",
      settings: "Cilësimet",
      newChat: "Bisedë e re",
      home: "Kryefaqja",
      studio: "XSUS Studio"
    },

    welcome: {
      greeting: "Mirë se erdhe në XSUS AI",
      title: "Çfarë mund të krijojmë sot?",
      description:
        "Inteligjencë, kreativitet dhe teknologji në një hapësirë.",
      suggestion1: "Më ndihmo të programoj",
      suggestion2: "Krijo një ide biznesi",
      suggestion3: "Analizo një dokument",
      suggestion4: "Më shpjego një temë"
    },

    chat: {
      placeholder: "Pyet XSUS AI çfarë të duash...",
      send: "Dërgo",
      voice: "Voice",
      attach: "Shto skedarë ose mjete",
      copy: "Kopjo",
      retry: "Provo përsëri",
      edit: "Redakto",
      delete: "Fshi",
      thinking: "XSUS AI po përpunon...",
      disclaimer:
        "XSUS AI mund të bëjë gabime. Verifiko informacionet e rëndësishme."
    },

    tools: {
      title: "Mjetet XSUS AI",
      search: "Kërko një mjet...",
      camera: "Kamera",
      gallery: "Galeria",
      documents: "Dokumente / PDF",
      image: "Image Studio",
      video: "Video Studio",
      pdf: "PDF Studio",
      research: "Kërkim i avancuar",
      code: "Code Studio",
      data: "Analizë të dhënash",
      ecosystem: "Ekosistemi XSUS",
      comingSoon: "Së shpejti",
      noResults: "Nuk u gjet asnjë mjet.",
      close: "Mbyll menunë",

      descriptions: {
        camera: "Bëj një fotografi",
        gallery: "Zgjidh fotografi",
        documents: "Ngarko skedarë",
        image: "Gjenerim dhe redaktim imazhesh",
        video: "Krijim videosh",
        pdf: "Krijim dhe analizë dokumentesh",
        research: "Kërkim i avancuar",
        code: "Programim dhe analizë kodi",
        data: "Analizë të dhënash",
        ecosystem: "XSUS App, Web, Game, Logo, Domain"
      },

      unavailable:
        "{tool} nuk është lidhur ende me motorin përkatës."
    },

    files: {
      remove: "Hiq skedarin",
      tooLarge: "Skedari është shumë i madh.",
      limit: "Është arritur kufiri i skedarëve.",
      unsupported: "Formati nuk mbështetet.",
      maxFiles:
        "Mund të ngarkosh maksimumi {count} skedarë.",
      fileTooLarge:
        "{name} është më i madh se {size}.",
      removeNamed: "Hiq {name}",
      preview: "Pamje paraprake: {name}"
    },

    sections: {
      attachments: "Skedarë dhe kamera",
      creative: "Studio kreative",
      intelligence: "Inteligjencë",
      ecosystem: "Ekosistemi XSUS"
    },

    settings: {
      title: "Cilësimet",
      language: "Gjuha",
      appearance: "Pamja",
      account: "Llogaria",
      privacy: "Privatësia"
    },

    common: {
      close: "Mbyll",
      cancel: "Anulo",
      save: "Ruaj",
      loading: "Duke ngarkuar...",
      error: "Ndodhi një gabim.",
      unavailable: "Ky funksion nuk është ende aktiv."
    }
  },

  en: {
    brand: "XSUS AI",
    slogan: "THE X IDENTITY",

    navigation: {
      chat: "Chat",
      history: "History",
      projects: "Projects",
      knowledge: "Knowledge",
      settings: "Settings",
      newChat: "New chat",
      home: "Home",
      studio: "XSUS Studio"
    },

    welcome: {
      greeting: "Welcome to XSUS AI",
      title: "What can we create today?",
      description:
        "Intelligence, creativity and technology in one workspace.",
      suggestion1: "Help me write code",
      suggestion2: "Create a business idea",
      suggestion3: "Analyze a document",
      suggestion4: "Explain a topic"
    },

    chat: {
      placeholder: "Ask XSUS AI anything...",
      send: "Send",
      voice: "Voice",
      attach: "Add files or tools",
      copy: "Copy",
      retry: "Try again",
      edit: "Edit",
      delete: "Delete",
      thinking: "XSUS AI is processing...",
      disclaimer:
        "XSUS AI can make mistakes. Verify important information."
    },

    tools: {
      title: "XSUS AI Tools",
      search: "Search tools...",
      camera: "Camera",
      gallery: "Gallery",
      documents: "Documents / PDF",
      image: "Image Studio",
      video: "Video Studio",
      pdf: "PDF Studio",
      research: "Deep Research",
      code: "Code Studio",
      data: "Data Analysis",
      ecosystem: "XSUS Ecosystem",
      comingSoon: "Coming soon",
      noResults: "No tools found.",
      close: "Close menu",

      descriptions: {
        camera: "Take a photo",
        gallery: "Choose photos",
        documents: "Upload files",
        image: "Generate and edit images",
        video: "Create videos",
        pdf: "Create and analyze documents",
        research: "Advanced research",
        code: "Programming and code analysis",
        data: "Analyze data",
        ecosystem: "XSUS App, Web, Game, Logo, Domain"
      },

      unavailable:
        "{tool} is not connected to its engine yet."
    },

    files: {
      remove: "Remove file",
      tooLarge: "The file is too large.",
      limit: "File limit reached.",
      unsupported: "Unsupported file format.",
      maxFiles: "You can attach up to {count} files.",
      fileTooLarge: "{name} exceeds {size}.",
      removeNamed: "Remove {name}",
      preview: "Preview: {name}"
    },

    sections: {
      attachments: "Files and camera",
      creative: "Creative Studio",
      intelligence: "Intelligence",
      ecosystem: "XSUS Ecosystem"
    },

    settings: {
      title: "Settings",
      language: "Language",
      appearance: "Appearance",
      account: "Account",
      privacy: "Privacy"
    },

    common: {
      close: "Close",
      cancel: "Cancel",
      save: "Save",
      loading: "Loading...",
      error: "Something went wrong.",
      unavailable: "This feature is not active yet."
    }
  },

  fr: {
    brand: "XSUS AI",
    slogan: "THE X IDENTITY",

    navigation: {
      chat: "Discussion",
      history: "Historique",
      projects: "Projets",
      knowledge: "Connaissances",
      settings: "Paramètres",
      newChat: "Nouvelle discussion",
      home: "Accueil",
      studio: "XSUS Studio"
    },

    welcome: {
      greeting: "Bienvenue sur XSUS AI",
      title: "Que pouvons-nous créer aujourd'hui ?",
      description:
        "Intelligence, créativité et technologie dans un seul espace.",
      suggestion1: "Aide-moi à programmer",
      suggestion2: "Créer une idée d'entreprise",
      suggestion3: "Analyser un document",
      suggestion4: "Expliquer un sujet"
    },

    chat: {
      placeholder:
        "Demandez ce que vous voulez à XSUS AI...",
      send: "Envoyer",
      voice: "Voix",
      attach: "Ajouter des fichiers ou des outils",
      copy: "Copier",
      retry: "Réessayer",
      edit: "Modifier",
      delete: "Supprimer",
      thinking: "XSUS AI traite votre demande...",
      disclaimer:
        "XSUS AI peut faire des erreurs. Vérifiez les informations importantes."
    },

    tools: {
      title: "Outils XSUS AI",
      search: "Rechercher un outil...",
      camera: "Caméra",
      gallery: "Galerie",
      documents: "Documents / PDF",
      image: "Image Studio",
      video: "Video Studio",
      pdf: "PDF Studio",
      research: "Recherche approfondie",
      code: "Code Studio",
      data: "Analyse de données",
      ecosystem: "Écosystème XSUS",
      comingSoon: "Bientôt",
      noResults: "Aucun outil trouvé.",
      close: "Fermer le menu",

      descriptions: {
        camera: "Prendre une photo",
        gallery: "Choisir des photos",
        documents: "Importer des fichiers",
        image: "Générer et modifier des images",
        video: "Créer des vidéos",
        pdf: "Créer et analyser des documents",
        research: "Recherche avancée",
        code: "Programmation et analyse de code",
        data: "Analyser des données",
        ecosystem: "XSUS App, Web, Game, Logo, Domain"
      },

      unavailable:
        "{tool} n'est pas encore connecté à son moteur."
    },

    files: {
      remove: "Supprimer le fichier",
      tooLarge: "Le fichier est trop volumineux.",
      limit: "Limite de fichiers atteinte.",
      unsupported:
        "Format de fichier non pris en charge.",
      maxFiles:
        "Vous pouvez joindre jusqu'à {count} fichiers.",
      fileTooLarge:
        "{name} dépasse la limite de {size}.",
      removeNamed: "Supprimer {name}",
      preview: "Aperçu : {name}"
    },

    sections: {
      attachments: "Fichiers et caméra",
      creative: "Studio créatif",
      intelligence: "Intelligence",
      ecosystem: "Écosystème XSUS"
    },

    settings: {
      title: "Paramètres",
      language: "Langue",
      appearance: "Apparence",
      account: "Compte",
      privacy: "Confidentialité"
    },

    common: {
      close: "Fermer",
      cancel: "Annuler",
      save: "Enregistrer",
      loading: "Chargement...",
      error: "Une erreur est survenue.",
      unavailable:
        "Cette fonctionnalité n'est pas encore active."
    }
  }
});

function resolveTranslation(dictionary, key) {
  if (typeof key !== "string" || !key) {
    return undefined;
  }

  return key.split(".").reduce((value, part) => {
    if (
      value === null ||
      typeof value !== "object" ||
      !Object.prototype.hasOwnProperty.call(value, part)
    ) {
      return undefined;
    }

    return value[part];
  }, dictionary);
}

export function normalizeUILanguage(value) {
  if (typeof value !== "string") {
    return null;
  }

  const language = value
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];

  return SUPPORTED_UI_LANGUAGES.includes(language)
    ? language
    : null;
}

export function translateUI(
  key,
  language = DEFAULT_UI_LANGUAGE,
  parameters = {}
) {
  const code =
    normalizeUILanguage(language) ||
    DEFAULT_UI_LANGUAGE;

  let result = resolveTranslation(
    UI_TRANSLATIONS[code],
    key
  );

  if (typeof result !== "string") {
    result = resolveTranslation(
      UI_TRANSLATIONS[DEFAULT_UI_LANGUAGE],
      key
    );
  }

  if (typeof result !== "string") {
    return key;
  }

  return result.replace(
    /\{([a-zA-Z][a-zA-Z0-9]*)\}/g,
    (match, name) => {
      if (
        parameters &&
        Object.prototype.hasOwnProperty.call(
          parameters,
          name
        )
      ) {
        return String(parameters[name]);
      }

      return match;
    }
  );
}

function readStoredLanguage() {
  try {
    return normalizeUILanguage(
      window.localStorage.getItem(STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

function saveLanguage(language) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      language
    );
  } catch {
    // Storage may be unavailable.
  }
}

function detectBrowserLanguage() {
  if (typeof navigator === "undefined") {
    return DEFAULT_UI_LANGUAGE;
  }

  const preferences = Array.isArray(navigator.languages)
    ? navigator.languages
    : [navigator.language];

  for (const preference of preferences) {
    const language = normalizeUILanguage(preference);

    if (language) {
      return language;
    }
  }

  return DEFAULT_UI_LANGUAGE;
}

export function createLanguageController(options = {}) {
  const {
    root = document,
    initialLanguage = null,
    onLanguageChange = () => {}
  } = options;

  let destroyed = false;

  let currentLanguage =
    normalizeUILanguage(initialLanguage) ||
    readStoredLanguage() ||
    detectBrowserLanguage();

  const cleanups = [];

  function applyTranslations() {
    if (destroyed) return;

    const language = currentLanguage;

    if (root === document) {
      document.documentElement.lang = language;
    } else if (root instanceof HTMLElement) {
      root.lang = language;
    }

    root.querySelectorAll("[data-i18n]").forEach(
      element => {
        const key = element.dataset.i18n;

        if (key) {
          element.textContent = translateUI(
            key,
            language
          );
        }
      }
    );

    const attributes = [
      ["data-i18n-placeholder", "placeholder"],
      ["data-i18n-title", "title"],
      ["data-i18n-aria-label", "aria-label"]
    ];

    for (const [selector, attribute] of attributes) {
      root.querySelectorAll(`[${selector}]`).forEach(
        element => {
          const key = element.getAttribute(selector);

          if (key) {
            element.setAttribute(
              attribute,
              translateUI(key, language)
            );
          }
        }
      );
    }

    root.querySelectorAll(
      "[data-xsus-language-select]"
    ).forEach(select => {
      if (select.value !== language) {
        select.value = language;
      }
    });
  }

  function setLanguage(value) {
    if (destroyed) return false;

    const normalized = normalizeUILanguage(value);

    if (!normalized) {
      return false;
    }

    const changed = currentLanguage !== normalized;

    currentLanguage = normalized;

    saveLanguage(normalized);
    applyTranslations();

    if (changed) {
      onLanguageChange(normalized);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("xsus:language-change", {
            detail: {
              language: normalized
            }
          })
        );
      }
    }

    return true;
  }

  function handleSelectChange(event) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const select = target.closest(
      "[data-xsus-language-select]"
    );

    if (
      !select ||
      (root !== document && !root.contains(select))
    ) {
      return;
    }

    setLanguage(select.value);
  }

  root.addEventListener(
    "change",
    handleSelectChange
  );

  cleanups.push(() => {
    root.removeEventListener(
      "change",
      handleSelectChange
    );
  });

  applyTranslations();

  return Object.freeze({
    getLanguage: () => currentLanguage,

    setLanguage,

    translate: (key, parameters = {}) =>
      translateUI(
        key,
        currentLanguage,
        parameters
      ),

    refresh: applyTranslations,

    getSupportedLanguages: () => [
      ...SUPPORTED_UI_LANGUAGES
    ],

    destroy() {
      if (destroyed) return;

      destroyed = true;
      cleanups.forEach(cleanup => cleanup());
    }
  });
}
