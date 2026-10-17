// services/ideas-service.js

export async function checkContentIdeas(userQuery, lang = 'sq') {
    if (!userQuery) return null;

    const query = userQuery.trim();
    const lowerQuery = query.toLowerCase();

    // 1. Mbrojtje e menjëhershme: Nëse është kërkesë për ngjyra, ktheje atë në shqip
    if (lowerQuery.includes("ngjyr") || lowerQuery.includes("color") || lowerQuery.includes("hex") || lowerQuery.includes("rast")) {
        const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const isSq = lang === 'sq' || lowerQuery.includes("më jep") || lowerQuery.includes("me jep") || lowerQuery.includes("ngjyr") || lowerQuery.includes("rast");
        
        if (isSq) {
            return `🎨 **Ngjyrë e Rastësishme për Dizajn:**\n- Kodi Hex: **${randomHex}**\n- Ngjyra: <span style="background-color: ${randomHex}; padding: 2px 12px; border-radius: 4px; color: #fff; font-weight: bold;">${randomHex}</span>`;
        }
        return `🎨 **Random Color for Design:**\n- Hex Code: **${randomHex}**\n- Color: <span style="background-color: ${randomHex}; padding: 2px 12px; border-radius: 4px; color: #fff; font-weight: bold;">${randomHex}</span>`;
    }

    // 2. Fjalët kyçe për kërkim idesh (në shqip, frëngjisht, anglisht)
    const isIdeaRequest = [
        "ide për", "ide per", "skenar", "titull për", "titull per", "përmbajtje",
        "idea for", "content idea", "video script", "catchy title",
        "idée de", "script vidéo", "titre accrocheur"
    ].some(phrase => lowerQuery.includes(phrase));

    if (!isIdeaRequest) return null;

    // 3. Përcaktimi i saktë i gjuhës (me përparësi për Shqipen)
    const isFr = (lang === 'fr' || lowerQuery.includes("idée") || lowerQuery.includes("vidéo") || lowerQuery.includes("titre")) && lang !== 'sq';
    const isSq = lang === 'sq' || lowerQuery.includes("ide") || lowerQuery.includes("skenar") || lowerQuery.includes("titull") || lowerQuery.includes("përmbajtje") || lowerQuery.includes("më jep") || lowerQuery.includes("me jep");

    // 4. Ekstraktimi i temës
    let topic = query;
    const cleanWords = ["ide për", "ide per", "skenar", "titull për", "titull per", "përmbajtje", "idea for", "content idea", "video script", "catchy title", "idée de", "script vidéo", "titre accrocheur"];
    
    cleanWords.forEach(word => {
        topic = topic.replace(new RegExp(word, 'gi'), '').trim();
    });

    if (!topic) {
        topic = isSq ? "teknologji dhe rrjete sociale" : isFr ? "technologie et réseaux sociaux" : "technology and social media";
    }

    // 5. Gjenerimi i përgjigjes sipas gjuhës
    let header = isSq ? `💡 **Ide dhe Skenar i Shpejtë për:** _"${topic}"_\n\n` :
                 isFr ? `💡 **Idées et Scénario Rapide pour:** _"${topic}"_\n\n` :
                        `💡 **Content Ideas & Quick Script for:** _"${topic}"_\n\n`;

    let section1 = isSq ? "🎬 **Titujt më tërheqës (Hook):**\n" :
                   isFr ? "🎬 **Titres accrocheurs (Hook):**\n" :
                          "🎬 **Catchy Hooks / Titles:**\n";
    
    if (isSq) {
        section1 += `- "${topic}: A e dinit këtë sekret?"\n- "Gabimi më i madh që bëni me ${topic}!"\n- "Si ta përmirësosh ${topic} në 3 hapa të thjeshtë."\n\n`;
    } else if (isFr) {
        section1 += `- "${topic}: Saviez-vous ce secret?"\n- "La plus grande erreur avec ${topic}!"\n- "Comment améliorer ${topic} en 3 étapes simples."\n\n`;
    } else {
        section1 += `- "${topic}: Did you know this secret?"\n- "The biggest mistake you make with ${topic}!"\n- "How to improve ${topic} in 3 simple steps."\n\n`;
    }

    let section2 = isSq ? "📝 **Struktura e Videos (Shorts / Reel / TikTok):**\n" :
                   isFr ? "📝 **Structure de la Vidéo (Shorts / Reel / TikTok):**\n" :
                          "📝 **Video Structure (Shorts / Reel / TikTok):**\n";
    
    if (isSq) {
        section2 += `1. **Sekonda 0-3 (Kapja e vëmendjes):** Trego rezultatin përfundimtar ose bëj një pyetje provokuese rreth ${topic}.\n`;
        section2 += `2. **Sekonda 3-20 (Përmbajtja kryesore):** Jep 2 këshilla ose detaje praktike shpejt dhe qartë.\n`;
        section2 += `3. **Thirrja për veprim (CTA):** "Komento mendimin tuaj dhe bëj subscribe për më shumë!"\n\n`;
    } else if (isFr) {
        section2 += `1. **Secondes 0-3 (Accroche):** Montrez le résultat final ou posez une question provocatrice sur ${topic}.\n`;
        section2 += `2. **Secondes 3-20 (Contenu principal):** Donnez 2 conseils pratiques rapidement.\n`;
        section2 += `3. **Appel à l'action (CTA):** "Laissez un commentaire et abonnez-vous pour plus!"\n\n`;
    } else {
        section2 += `1. **Seconds 0-3 (Hook):** Show the final result or ask a provocative question about ${topic}.\n`;
        section2 += `2. **Seconds 3-20 (Main Content):** Give 2 practical tips quickly and clearly.\n`;
        section2 += `3. **Call To Action (CTA):** "Comment your thoughts and subscribe for more!"\n\n`;
    }

    let footer = isSq ? "_Mund të pyesni përsëri për një temë tjetër, p.sh: 'Ide për [temë]'._" :
                 isFr ? "_Vous pouvez demander pour un autre sujet, ex: 'Idée pour [sujet]'._" :
                        "_You can ask for another topic, e.g., 'Content idea for [topic]'._";

    return header + section1 + section2 + footer;
}
