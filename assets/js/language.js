
/**
 * XSUS STUDIO — LANGUAGE ENGINE
 * Complete EN / SQ / FR translations
 * Premium Footer Integration
 * THE X IDENTITY
 */

(() => {
  "use strict";

  const STORAGE_KEY = "xsus-language";

  const translations = {
    en: {
      pageDescription:
        "XSUS Studio — The X Identity. Six specialized products in one technology ecosystem.",

      brandHome: "XSUS Studio Home",
      languageLabel: "Language",
      menuLabel: "Open navigation menu",
      navigationLabel: "Main navigation",
      globeLabel:
        "Interactive XSUS globe. Drag to rotate. Use arrow keys to adjust rotation.",

      home: "Home",
      login: "Login",
      signup: "Sign Up",

      eyebrow: "XSUS GLOBAL TECHNOLOGY PLATFORM",
      heroTitle: "Independent Technologies.",
      heroHighlight: "One Powerful Ecosystem.",
      intro:
        "Six specialized products. One unified vision. Build, create and innovate with the XSUS ecosystem.",

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
      domain: "Explore domains and digital identity.",

      aboutUs: "About Us",
      contactUs: "Contact",
      footerNavigation: "Footer navigation",
      footerVision:
        "Independent Technologies. One Powerful Ecosystem.",

      copyright:
        "© 2026 XSUS Studio. All rights reserved."
    },

    sq: {
      pageDescription:
        "XSUS Studio — The X Identity. Gjashtë produkte të specializuara në një ekosistem teknologjik.",

      brandHome: "Faqja kryesore e XSUS Studio",
      languageLabel: "Gjuha",
      menuLabel: "Hap menynë e navigimit",
      navigationLabel: "Navigimi kryesor",
      globeLabel:
        "Globi interaktiv XSUS. Tërhiqe për ta rrotulluar. Përdor tastet me shigjeta për të ndryshuar rrotullimin.",

      home: "Kreu",
      login: "Hyr",
      signup: "Regjistrohu",

      eyebrow: "PLATFORMA GLOBALE TEKNOLOGJIKE XSUS",
      heroTitle: "Teknologji të Pavarura.",
      heroHighlight: "Një Ekosistem i Fuqishëm.",
      intro:
        "Gjashtë produkte të specializuara. Një vizion i përbashkët. Ndërto, krijo dhe sill risi me ekosistemin XSUS.",

      explore: "Shiko Modulet",
      discoverAI: "Zbulo XSUS AI",
      modules: "Eksploro Ekosistemin",
      subtitle: "Gjashtë produkte. Një identitet teknologjik.",
      cardExplore: "Eksploro →",

      ai: "Inteligjencë, njohuri dhe përvoja me AI.",
      app: "Krijo dhe zhvillo aplikacione moderne digjitale.",
      web: "Dizajno dhe ndërto faqe moderne interneti.",
      game: "Eksploro zhvillimin e lojërave interaktive.",
      logo: "Krijo identitete vizuale të veçanta.",
      domain: "Eksploro domenet dhe identitetin digjital.",

      aboutUs: "Rreth Nesh",
      contactUs: "Kontakt",
      footerNavigation: "Navigimi i fundit të faqes",
      footerVision:
        "Teknologji të Pavarura. Një Ekosistem i Fuqishëm.",

      copyright:
        "© 2026 XSUS Studio. Të gjitha të drejtat e rezervuara."
    },

    fr: {
      pageDescription:
        "XSUS Studio — The X Identity. Six produits spécialisés réunis dans un écosystème technologique.",

      brandHome: "Accueil de XSUS Studio",
      languageLabel: "Langue",
      menuLabel: "Ouvrir le menu de navigation",
      navigationLabel: "Navigation principale",
      globeLabel:
        "Globe interactif XSUS. Faites glisser pour le faire pivoter. Utilisez les touches fléchées pour ajuster la rotation.",

      home: "Accueil",
      login: "Connexion",
      signup: "S'inscrire",

      eyebrow: "PLATEFORME TECHNOLOGIQUE MONDIALE XSUS",
      heroTitle: "Des technologies indépendantes.",
      heroHighlight: "Un écosystème puissant.",
      intro:
        "Six produits spécialisés. Une vision commune. Développez, créez et innovez avec l'écosystème XSUS.",

      explore: "Explorer les modules",
      discoverAI: "Découvrir XSUS AI",
      modules: "Explorer notre écosystème",
      subtitle: "Six produits. Une identité technologique.",
      cardExplore: "Explorer →",

      ai: "Intelligence, connaissances et expériences propulsées par l'IA.",
      app: "Créez et développez des applications numériques modernes.",
      web: "Concevez et développez des sites web modernes.",
      game: "Explorez le développement de jeux interactifs.",
      logo: "Créez des identités visuelles distinctives.",
      domain: "Explorez les domaines et l'identité numérique.",

      aboutUs: "À propos",
      contactUs: "Contact",
      footerNavigation: "Navigation de pied de page",
      footerVision:
        "Des technologies indépendantes. Un écosystème puissant.",

      copyright:
        "© 2026 XSUS Studio. Tous droits réservés."
    }
  };

  const attributeTranslations = {
    "[data-t-aria]": "aria-label",
    "[data-t-title]": "title",
    "[data-t-alt]": "alt"
  };

  function normalizeLanguage(value) {
    const lang = String(value || "en")
      .trim()
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

    document.querySelectorAll("[data-t]").forEach(element => {
      const key = element.getAttribute("data-t");

      if (
        Object.prototype.hasOwnProperty.call(
          dictionary,
          key
        )
      ) {
        element.textContent = dictionary[key];
      }
    });

    Object.entries(attributeTranslations).forEach(
      ([selector, attribute]) => {
        document.querySelectorAll(selector).forEach(element => {
          const dataKey = {
            "aria-label": "data-t-aria",
            title: "data-t-title",
            alt: "data-t-alt"
          }[attribute];

          const key = element.getAttribute(dataKey);

          if (
            Object.prototype.hasOwnProperty.call(
              dictionary,
              key
            )
          ) {
            element.setAttribute(
              attribute,
              dictionary[key]
            );
          }
        });
      }
    );

    const description = document.querySelector(
      'meta[name="description"]'
    );

    if (description) {
      description.setAttribute(
        "content",
        dictionary.pageDescription
      );
    }

    document.querySelectorAll(
      "#language, [data-language-selector]"
    ).forEach(selector => {
      selector.value = lang;
    });

    try {
      localStorage.setItem(
        STORAGE_KEY,
        lang
      );
    } catch {
      // Storage is optional.
    }

    return lang;
  }

  function initialize() {
    let saved =
      document.documentElement.lang || "en";

    try {
      saved =
        localStorage.getItem(STORAGE_KEY) ||
        saved;
    } catch {
      // Use document language.
    }

    document.querySelectorAll(
      "#language, [data-language-selector]"
    ).forEach(selector => {
      selector.addEventListener(
        "change",
        event => {
          setLanguage(event.target.value);
        }
      );
    });

    setLanguage(saved);
  }

  window.XSUSLanguage = Object.freeze({
    setLanguage,

    getLanguage: () =>
      normalizeLanguage(
        document.documentElement.lang
      ),

    supportedLanguages:
      Object.freeze(["en", "sq", "fr"])
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
