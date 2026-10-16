// services/language-engine.js

// 1. Zbulimi i Gjuhës (Language Detection)
export function detectQueryLanguage(userQuery = "") {
    const text = userQuery.toLowerCase().trim();

    // Fjalë kyçe për gjuhën shqipe
    const sqKeywords = [
        "moti", "sot", "nesër", "neser", "si", "është", "eshte", "sa", "janë", "jane", 
        "temperatura", "ndeshje", "lajme", "renditja", "namaz", "falje", "faleminderit", 
        "përshëndetje", "pershendetje", "çfarë", "cfare", "kush", "ku"
    ];

    // Fjalë kyçe për gjuhën frëngjisht
    const frKeywords = [
        "météo", "meteo", "demain", "aujourd'hui", "aujourdhui", "quel", "quelle", 
        "température", "temperature", "match", "classement", "prière", "priere", 
        "bonjour", "merci", "comment", "où", "ou"
    ];

    const words = text.split(/\s+/);
    
    let sqScore = 0;
    let frScore = 0;

    words.forEach(word => {
        const cleanWord = word.replace(/[^a-zëçàâéèêëîïôûùüÿñæœ]/g, "");
        if (sqKeywords.includes(cleanWord)) sqScore++;
        if (frKeywords.includes(cleanWord)) frScore++;
    });

    if (sqScore > frScore) return "sq";
    if (frScore > sqScore) return "fr";
    return "en"; // Default në anglisht nëse nuk detektohet shqip ose frëngjisht
}

// 2. Normalizimi i Tekstit (Text Normalization)
export function normalizeQueryText(text = "") {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Heq aksentet (ë->e, ç->c, é->e, etj.)
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// 3. Fjalor & Përkthime të Shpejta për Përgjigjet e Sistemit
export const systemTranslations = {
    sq: {
        error: "Ndodhi një gabim gjatë përpunimit të kërkesës suaj.",
        notFound: "Nuk u gjet asnjë informacion për kërkesën tuaj.",
        loading: "Duke kërkuar dhe analizuar..."
    },
    en: {
        error: "An error occurred while processing your request.",
        notFound: "No information could be found for your request.",
        loading: "Searching live web & analyzing..."
    },
    fr: {
        error: "Une erreur s'est produite lors du traitement de votre demande.",
        notFound: "Aucune information trouvée pour votre demande.",
        loading: "Recherche sur le web en direct et analyse..."
    }
};
