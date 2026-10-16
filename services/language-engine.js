// services/language-engine.js

// 1. Profilizimi i Gjuhës Shqipe & Fjalët Bosh (Stop Words)
export const ALBANIAN_PROFILE = {
    code: 'sq',
    name: 'Albanian',
    nativeName: 'Shqip'
};

// Lista e fjalëve pa peshë kërkimi (Stop Words)
export const ALBANIAN_STOP_WORDS = new Set([
    'a', 'as', 'dhe', 'e', 'edhe', 'i', 'ia',
    'jam', 'je', 'ishte', 'jane', 'janë',
    'ka', 'me', 'në', 'ne', 'nga', 'një', 'nje', 'pa',
    'për', 'per', 'që', 'qe', 'sa', 'se', 'si', 'të', 'te', 
    'atë', 'ate', 'kjo', 'këtë', 'kete', 'ata', 'ato', 
    'mund', 'nëse', 'duhet'
]);

// 2. Normalizimi i avancuar i tekstit Shqip
export function normalizeAlbanian(text = "") {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Heq aksentet (ë->e, ç->c, é->e)
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Nxjerrja e fjalëve kyçe (Keywords) duke hequr Stop Words
export function getAlbanianKeywords(text = "") {
    const cleanText = normalizeAlbanian(text);
    const words = cleanText.split(" ");
    
    return words.filter(word => {
        return word.length > 2 && !ALBANIAN_STOP_WORDS.has(word);
    });
}

// 3. Zbulimi i Gjuhës (Language Detection System)
export function detectQueryLanguage(userQuery = "") {
    if (!userQuery) return "en";
    const text = userQuery.toLowerCase().trim();

    // Fjalë treguese për shqipen
    const sqKeywords = [
        "moti", "sot", "nesër", "neser", "si", "është", "eshte", "sa", "janë", "jane", 
        "temperatura", "ndeshje", "lajme", "renditja", "namaz", "falje", "faleminderit", 
        "përshëndetje", "pershendetje", "çfarë", "cfare", "kush", "ku", "nga", "dhe"
    ];

    // Fjalë treguese për frëngjishten
    const frKeywords = [
        "météo", "meteo", "demain", "aujourd'hui", "aujourdhui", "quel", "quelle", 
        "température", "temperature", "match", "classement", "prière", "priere", 
        "bonjour", "merci", "comment", "où", "ou", "dans", "avec"
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
    return "en";
}

export function normalizeQueryText(text = "") {
    return normalizeAlbanian(text);
}

// 4. Përkthime të Shpejta të Sistemit
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
