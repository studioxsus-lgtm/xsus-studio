// services/ideas-service.js

export async function checkContentIdeas(userQuery) {
    const query = userQuery.trim();
    const lowerQuery = query.toLowerCase();

    // Fjalët kyçe për kërkim idesh (në shqip, frëngjisht, anglisht)
    const isIdeaRequest = [
        "ide për", "ide per", "skenar", "titull për", "titull per", "përmbajtje",
        "idea for", "content idea", "video script", "catchy title",
        "idée de", "script vidéo", "titre accrocheur"
    ].some(phrase => lowerQuery.includes(phrase));

    if (!isIdeaRequest) return null;

    // Përcaktimi i gjuhës
    const isFr = lowerQuery.includes("idée") || lowerQuery.includes("vidéo") || lowerQuery.includes("titre");
    const isSq = lowerQuery.includes("ide") || lowerQuery.includes("skenar") || lowerQuery.includes("titull") || lowerQuery.includes("përmbajtje");

    // Ekstraktimi i temës (heqim fjalët kyçe për të gjetur çfarë kërkon saktësisht përdoruesi)
    let topic = query;
    const cleanWords = ["ide për", "ide per", "skenar", "titull për", "titull per", "përmbajtje", "idea for", "content idea", "video script", "catchy title", "idée de", "script vidéo", "titre accrocheur"];
    
    cleanWords.forEach(word => {
        topic = topic.replace(new RegExp(word, 'gi'), '').trim();
    });

    if (!topic) {
        topic = isSq ? "teknologji dhe rrjete sociale" : isFr ? "technologie et réseaux sociaux" : "technology and social media";
    }

    // Gjenerimi i strukturës së ideve
    let header = isSq ? `💡 **Ide dhe Skenar i Shpejtë për:** _"${topic}"_\n\n` :
                 isFr ? `💡 **Idées et Scénario Rapide pour:** _"${topic}"_\n\n` :
                        `💡 **Content Ideas & Quick Script for:** _"${topic}"_\n\n`;

    let section1 = isSq ? "🎬 **Titujt më tërheqës (Hook):**\n" :
                   isFr ? "🎬 **Titres accrocheurs (Hook):**\n" :
                          "🎬 **Catchy Hooks / Titles:**\n";
    
    section1 += `- "${topic}: A e dinit këtë sekret?"\n- "Gabimi më i madh që bëni me ${topic}!"\n- "Si ta përmirësosh ${topic} në 3 hapa të thjeshtë."\n\n`;

    let section2 = isSq ? "📝 **Struktura e Videos (Shorts / Reel / TikTok):**\n" :
                   isFr ? "📝 **Structure de la Vidéo (Shorts / Reel / TikTok):**\n" :
                          "📝 **Video Structure (Shorts / Reel / TikTok):**\n";
    
    section2 += `1. **Sekonda 0-3 (Kapja e vëmendjes):** Trego rezultatin përfundimtar ose bëj një pyetje provokuese rreth ${topic}.\n`;
    section2 += `2. **Sekonda 3-20 (Përmbajtja kryesore):** Jep 2 këshilla ose detaje praktike shpejt dhe qartë.\n`;
    section2 += `3. **Thirrja për veprim (CTA):** "Komento mendimin tuaj dhe bëj subscribe për më shumë!"\n\n`;

    let footer = isSq ? "_Mund të pyesni përsëri për një temë tjetër, p.sh: 'Ide për [temë]'._" :
                 isFr ? "_Vous pouvez demander pour un autre sujet, ex: 'Idée pour [sujet]'._" :
                        "_You can ask for another topic, e.g., 'Content idea for [topic]'._";

    return header + section1 + section2 + footer;
}
