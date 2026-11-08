
/**
 * XSUS STUDIO — LANGUAGE ENGINE
 * EN / SQ / FR
 */

(() => {
  "use strict";

  const STORAGE_KEY = "xsus-language";

  const translations = {
    en: {
      home: "Home",
      login: "Login",
      signup: "Sign Up",
      intro: "A unified technology studio for artificial intelligence, applications, websites, games, visual identities and domains.",
      explore: "Explore Modules",
      discoverAI: "Discover XSUS AI",
      modules: "Explore Our Ecosystem",
      subtitle: "Six products. One technological identity.",
      cardExplore: "Explore →",
      ai: "Intelligence, knowledge and AI-powered experiences.",
      app: "Create and develop modern digital applications.",
      web: "Design and build modern websites.",
      game: "Explore interactive game development.",
      logo: "Create distinctive visual identities.",
      domain: "Explore domains and digital identity."
    },

    sq: {
      home: "Kreu",
      login: "Hyr",
      signup: "Regjistrohu",
      intro: "Një studio teknologjike për inteligjencën artificiale, aplikacionet, faqet web, lojërat, identitetet vizuale dhe domenet.",
      explore: "Shiko Modulet",
      discoverAI: "Zbulo XSUS AI",
      modules: "Eksploro Ekosistemin",
      subtitle: "Gjashtë produkte. Një identitet teknologjik.",
      cardExplore: "Eksploro →",
      ai: "Inteligjencë, njohuri dhe përvoja me AI.",
      app: "Krijo dhe zhvillo aplikacione moderne.",
      web: "Dizajno dhe ndërto faqe web moderne.",
      game: "Eksploro zhvillimin e lojërave interaktive.",
      logo: "Krijo identitete vizuale të veçanta.",
      domain: "Eksploro domenet dhe identitetin digjital."
    },

    fr: {
      home: "Accueil",
      login: "Connexion",
      signup: "S'inscrire",
      intro: "Un studio technologique pour l'intelligence artificielle, les applications, les sites web, les jeux, les identités visuelles et les domaines.",
      explore: "Explorer les modules",
      discoverAI: "Découvrir XSUS AI",
      modules: "Explorer notre écosystème",
      subtitle: "Six produits. Une identité technologique.",
      cardExplore: "Explorer →",
      ai: "Intelligence, connaissances et expériences IA.",
      app: "Créer et développer des applications modernes.",
      web: "Concevoir et créer des sites web modernes.",
      game: "Explorer le développement de jeux interactifs.",
      logo: "Créer des identités visuelles distinctives.",
      domain: "Explorer les domaines et l'identité numérique."
    }
  };

  function normalizeLanguage(value) {
    const lang = String(value || "en")
      .toLowerCase()
      .split("-")[0];

    return Object.prototype.hasOwnProperty.call(
      translations,
      lang
    ) ? lang : "en";
  }

  function setLanguage(value) {
    const lang = normalizeLanguage(value);
    const dictionary = translations[lang];

    document.documentElement.lang = lang;

    document.querySelectorAll("[data-t]").forEach(
      element => {
        const key = element.dataset.t;
        if (typeof dictionary[key] === "string") {
          element.textContent = dictionary[key];
        }
      }
    );

    document.querySelectorAll(
      "#language, [data-language-selector]"
    ).forEach(selector => {
      selector.value = lang;
    });

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage is optional.
    }

    return lang;
  }

  function initialize() {
    let saved = document.documentElement.lang || "en";

    try {
      saved = localStorage.getItem(STORAGE_KEY) || saved;
    } catch {
      // Use document language.
    }

    document.querySelectorAll(
      "#language, [data-language-selector]"
    ).forEach(selector => {
      selector.addEventListener("change", event => {
        setLanguage(event.target.value);
      });
    });

    setLanguage(saved);
  }

  window.XSUSLanguage = Object.freeze({
    setLanguage,
    getLanguage: () =>
      normalizeLanguage(document.documentElement.lang),
    supportedLanguages: Object.freeze(["en", "sq", "fr"])
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();
