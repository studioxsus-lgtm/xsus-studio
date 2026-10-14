// services/translation-service.js

export async function checkTranslation(userQuery) {
    const rawQuery = userQuery.trim();
    const lowerQuery = rawQuery.toLowerCase();

    // Kontrollojmë nëse kërkesa përmban fjalë kyçe për përkthim
    const isTranslateRequest = lowerQuery.includes("përkthe") || 
                               lowerQuery.includes("perkthe") || 
                               lowerQuery.includes("translate") || 
                               lowerQuery.includes("traduis");

    if (!isTranslateRequest) return null;

    // Identifikojmë gjuhën e synuar (Target Language)
    let targetLang = "en";
    let langName = "Anglisht";

    if (lowerQuery.includes("frëngjisht") || lowerQuery.includes("frengjisht") || lowerQuery.includes("french") || lowerQuery.includes("français")) {
        targetLang = "fr";
        langName = "Frëngjisht";
    } else if (lowerQuery.includes("shqip") || lowerQuery.includes("albanian")) {
        targetLang = "sq";
        langName = "Shqip";
    } else if (lowerQuery.includes("anglisht") || lowerQuery.includes("english")) {
        targetLang = "en";
        langName = "Anglisht";
    } else if (lowerQuery.includes("gjermanisht") || lowerQuery.includes("german")) {
        targetLang = "de";
        langName = "Gjermanisht";
    } else if (lowerQuery.includes("italisht") || lowerQuery.includes("italian")) {
        targetLang = "it";
        langName = "Italisht";
    } else if (lowerQuery.includes("spanjollisht") || lowerQuery.includes("spanish")) {
        targetLang = "es";
        langName = "Spanjollisht";
    }

    // Pastrojmë urdhrin e përkthimit për të nxjerrë VETËM tekstin e përdoruesit
    let textToTranslate = rawQuery
        .replace(/ma përkthe në [a-zëçë]+/gi, "")
        .replace(/ma perkthe ne [a-zëçë]+/gi, "")
        .replace(/përkthe në [a-zëçë]+/gi, "")
        .replace(/perkthe ne [a-zëçë]+/gi, "")
        .replace(/translate to [a-z]+/gi, "")
        .replace(/traduis en [a-z]+/gi, "")
        .replace(/përkthe/gi, "")
        .replace(/perkthe/gi, "")
        .replace(/translate/gi, "")
        .replace(/traduis/gi, "")
        .replace(/^[\s\:\-\–\—\?]+|[\s\:\-\–\—\?]+$/g, "") // Heqim simbole si -, :, ? në fillim e fund
        .trim();

    if (!textToTranslate) {
        return "Ju lutem shkruani tekstin që dëshironi të përktheni.";
    }

    try {
        // Përdorim motorin e Google Translate për përkthim të plotë e profesional
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data && data[0]) {
            // Bashkojmë të gjitha fjalitë e përkthyera nëse është tekst i gjatë
            const translatedText = data[0].map(item => item[0]).join("");
            return `🌐 Përkthimi në ${langName}:\n\n"${translatedText}"`;
        }
    } catch (err) {
        console.warn("Gabim gjatë përkthimit:", err);
    }

    return "Më falni, pati një problem me serverin e përkthimit. Ju lutem provoni përsëri.";
}
