
/**
 * XSUS STUDIO — LANGUAGE ENGINE
 * Version: 1.0.0
 *
 * Languages: EN / SQ / FR
 * Independent from navigation and globe.
 */

(() => {
  "use strict";

  const STORAGE_KEY = "xsus-language";

  const SUPPORTED_LANGUAGES = [
    "en",
    "sq",
    "fr"
  ];

  const translations = {
    en: {
      ai: "XSUS AI",
      app: "XSUS APP",
      web: "XSUS WEB",
      game: "XSUS GAME",
      logo: "XSUS LOGO",
      domain: "XSUS DOMAIN",

      login: "Login",
      signup: "Sign Up",

      explore: "Explore",
      modules: "Our Modules",

      heroTitle: "Build the Future with XSUS",
      heroDescription:
        "A technology platform for artificial intelligence, applications, websites, games, logos and domains."
    },

    sq: {
      ai: "XSUS AI",
      app: "XSUS APP",
      web: "XSUS WEB",
      game: "XSUS GAME",
      logo: "XSUS LOGO",
      domain: "XSUS DOMAIN",

      login: "Hyr",
      signup: "Regjistrohu",

      explore: "Eksploro",
      modules: "Modulet tona",

      heroTitle: "Ndërto të ardhmen me XSUS",
      heroDescription:
        "Një platformë teknologjike për inteligjencë artificiale, aplikacione, faqe interneti, lojëra, logo dhe domene."
    },

    fr: {
      ai: "XSUS AI",
      app: "XSUS APP",
      web: "XSUS WEB",
      game: "XSUS GAME",
      logo: "XSUS LOGO",
      domain: "XSUS DOMAIN",

      login: "Connexion",
      signup: "S'inscrire",

      explore: "Explorer",
      modules: "Nos modules",

      heroTitle: "Construisez l'avenir avec XSUS",
      heroDescription:
        "Une plateforme technologique pour l'intelligence artificielle, les applications, les sites web, les jeux, les logos et les domaines."
    }
  };

  function normalizeLanguage(value) {
    const language = String(value || "")
      .trim()
      .toLowerCase()
      .split("-")[0];

    return SUPPORTED_LANGUAGES.includes(language)
      ? language
      : "en";
  }

  function getSavedLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function saveLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Storage may be unavailable.
    }
  }

  function translatePage(language) {
    const dictionary = translations[language];

    document.querySelectorAll("[data-i18n]").forEach(
      (element) => {
        const key = element.getAttribute("data-i18n");

        if (
          Object.prototype.hasOwnProperty.call(
            dictionary,
            key
          )
        ) {
          element.textContent = dictionary[key];
        }
      }
    );

    document.documentElement.lang = language;
  }

  function setLanguage(value) {
    const language = normalizeLanguage(value);

    translatePage(language);
    saveLanguage(language);

    document.querySelectorAll(
      '[data-language-selector]'
    ).forEach((selector) => {
      selector.value = language;
    });

    return language;
  }

  function initializeLanguage() {
    const saved = getSavedLanguage();

    const initialLanguage = saved
      ? normalizeLanguage(saved)
      : normalizeLanguage(
          document.documentElement.lang
        );

    document.querySelectorAll(
      '[data-language-selector]'
    ).forEach((selector) => {
      selector.addEventListener("change", (event) => {
        setLanguage(event.target.value);
      });
    });

    setLanguage(initialLanguage);
  }

  window.XSUSLanguage = Object.freeze({
    setLanguage,
    getLanguage: () =>
      normalizeLanguage(
        document.documentElement.lang
      ),
    supportedLanguages: Object.freeze([
      ...SUPPORTED_LANGUAGES
    ])
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeLanguage,
      { once: true }
    );
  } else {
    initializeLanguage();
  }
})();
