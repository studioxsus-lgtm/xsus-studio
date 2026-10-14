// services/translation-service.js

export async function checkTranslation(userQuery) {
    const query = userQuery.trim();
    const lowerQuery = query.toLowerCase();

    // Fjalët kyçe për përkthim
    const translateKeywords = [
        "përkthe", "perkthe", "translate", "traduis"
    ];

    const isTranslateRequest = translateKeywords.some(keyword => lowerQuery.startsWith(keyword) || lowerQuery.includes("përkthe në") || lowerQuery.includes("perkthe ne") || lowerQuery.includes("translate to"));
    if (!isTranslateRequest) return null;

    // Identifikimi i gjuhës së synuar
    let targetLang = "en"; // Parazgjedhje Anglisht
    let langName = "English";

    if (lowerQuery.includes("shqip") || lowerQuery.includes("albanian")) {
        targetLang = "sq";
        langName = "Shqip";
    } else if (lowerQuery.includes("frëngjisht") || lowerQuery.includes("frengjisht") || lowerQuery.includes("french") || lowerQuery.includes("français")) {
        targetLang = "fr";
        langName = "Frëngjisht";
    } else if (lowerQuery.includes("anglisht") || lowerQuery.includes("english")) {
        targetLang = "en";
        langName = "Anglisht";
    }

    // Nxjerrim tekstin që duhet përkthyer duke hequr fjalët kyçe
    let textToTranslate = query
        .replace(/përkthe në [a-zëçë]+:|perkthe ne [a-zëçë]+:|përkthe:|perkthe:|translate to [a-z]+:|translate:|traduis en [a-z]+:|traduis:/gi, "")
        .trim();

    if (!textToTranslate) {
        return "Ju lutem shkruani tekstin që dëshironi të përktheni.";
    }

    try {
        // Përdorim API-në falas të MyMemory për përkthim të saktë
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=autodetect|${targetLang}`);
        const data = await res.json();

        if (data && data.responseData && data.responseData.translatedText) {
            const translated = data.responseData.translatedText;
            return `🌐 Përkthimi në ${langName}:\n\n"${translated}"`;
        }
    } catch (err) {
        console.warn("Gabim te Translation API:", err);
    }

    return "Më falni, pata një problem gjatë përkthimit. Provoni përsëri.";
}
