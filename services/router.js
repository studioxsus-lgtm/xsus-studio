
 // services/router.js
import { studioCore } from './xsus-core.js';
import {
    loadCustomKnowledge,
    checkCustomKnowledge
} from './custom-knowledge-service.js';
import { searchKnowledge } from './knowledge-service.js';
import { javaKnowledge } from './javaKnowledge.js';
import {
    detectQueryLanguage,
    normalizeQueryText
} from './language-engine.js';
import { analyzeAlbanianGrammar } from './grammar-engine.js';
import { checkWikipedia } from './wikipedia-service.js';
import { checkNews } from './news-service.js';
import { checkSports } from './sports-service.js';
import { checkNotes } from './notes-service.js';
import { checkContentIdeas } from './ideas-service.js';
import { checkMath } from './math-service.js';
import { checkQRCode } from './qr-service.js';
import { checkWeather } from './weather-service.js';
import { checkFinance } from './finance-service.js';
import { checkTranslation } from './translation-service.js';
import { checkConverter } from './converter-service.js';
import { checkImageGeneration } from './image-service.js';

// Ngarkimi fillestar i njohurive të personalizuara.
try {
    loadCustomKnowledge();
} catch (error) {
    console.warn('Gabim te custom knowledge:', error);
}

// -------------------------------------------------------------
// JAVA MASTER KNOWLEDGE
// -------------------------------------------------------------
function checkJavaKnowledge(userQuery, lang = 'sq') {
    if (!userQuery || !Array.isArray(javaKnowledge)) {
        return null;
    }

    const clean = normalizeQueryText(userQuery);

    const match = javaKnowledge.find((item) => {
        const titleSq = normalizeQueryText(item.title_sq || '');
        const titleEn = normalizeQueryText(item.title || '');

        return (
            (titleSq && clean.includes(titleSq)) ||
            (titleEn && clean.includes(titleEn))
        );
    });

    if (!match) return null;

    if (lang === 'en') {
        return `### ☕ ${match.title || 'Java Knowledge'}

${match.content_en || ''}

**💻 Code Example:**
\`\`\`java
${match.example || '// Java example'}
\`\`\``;
    }

    return `### ☕ ${match.title_sq || match.title || 'Njohuri Java'}

${match.content_sq || match.content_en || ''}

**💻 Shembull Kodi:**
\`\`\`java
${match.example || '// Shembull Java'}
\`\`\``;
}

// -------------------------------------------------------------
// KNOWLEDGE ISLAMIKE
// -------------------------------------------------------------
function checkIslamicKnowledge(userQuery, lang = 'sq') {
    if (!userQuery) return null;

    const clean = normalizeQueryText(userQuery);

    const prayerKeywords = [
        'namaz', 'falje', 'orari i namazit',
        'sabah', 'sabahu', 'sabahit',
        'drek', 'dreka', 'drekes', 'drekas',
        'ikindi', 'ikindia', 'ikindise',
        'aksham', 'akshami', 'akshamit',
        'jaci', 'jacia', 'jacise',
        'fejr', 'dhuhr', 'asr', 'maghrib', 'isha',
        'prayer times', 'salat', 'heures de priere',
        'priere', 'fajr', 'dhohr'
    ];

    if (prayerKeywords.some((word) => clean.includes(word))) {
        if (lang === 'en') {
            return `🕌 **Daily Prayer Information**

- **Fajr:** Morning prayer before sunrise.
- **Dhuhr:** Midday prayer.
- **Asr:** Afternoon prayer.
- **Maghrib:** Sunset prayer.
- **Isha:** Night prayer.

*Exact times depend on your location and calculation method.*`;
        }

        if (lang === 'fr') {
            return `🕌 **Informations sur les prières quotidiennes**

- **Fajr :** Prière du matin.
- **Dhuhr :** Prière de midi.
- **Asr :** Prière de l'après-midi.
- **Maghrib :** Prière du coucher du soleil.
- **Isha :** Prière de la nuit.

*Les horaires exacts dépendent de la localisation et de la méthode de calcul.*`;
        }

        return `🕌 **Informacion mbi namazet**

- **Fajr / Sabahu:** Para lindjes së diellit.
- **Dhuhr / Dreka:** Mesdita.
- **Asr / Ikindia:** Pasdite.
- **Maghrib / Akshami:** Perëndimi i diellit.
- **Isha / Jacia:** Nata.

*Oraret e sakta varen nga vendndodhja dhe metoda e llogaritjes.*`;
    }

    const ramadanKeywords = [
        'ramazan', 'ramadan', 'agjerim', 'agjerimi',
        'fasting', 'jeune', 'imsak', 'iftar', 'syfyr', 'syfyri'
    ];

    if (ramadanKeywords.some((word) => clean.includes(word))) {
        if (lang === 'en') {
            return `🌙 **Ramadan and Fasting**

Ramadan is the Islamic month of fasting and reflection. Fasting begins at dawn and ends at sunset.`;
        }

        if (lang === 'fr') {
            return `🌙 **Ramadan et jeûne**

Le Ramadan est le mois islamique du jeûne et du recueillement. Le jeûne commence à l'aube et se termine au coucher du soleil.`;
        }

        return `🌙 **Ramazani dhe agjërimi**

Ramazani është muaji islam i agjërimit dhe përkushtimit. Agjërimi fillon në agim dhe përfundon në perëndim të diellit.`;
    }

    const zakatKeywords = [
        'zeqat', 'zeqati', 'zekat', 'zakat', 'alms'
    ];

    if (zakatKeywords.some((word) => clean.includes(word))) {
        if (lang === 'en') {
            return `💰 **Zakat**

Zakat is an obligatory form of charity for eligible Muslims. The commonly cited rate for qualifying savings is 2.5%, subject to the applicable rules and Nisab threshold.`;
        }

        if (lang === 'fr') {
            return `💰 **Zakat**

La zakat est une aumône obligatoire pour les musulmans concernés. Le taux couramment cité pour certains biens éligibles est de 2,5 %, selon les règles applicables et le seuil du Nisab.`;
        }

        return `💰 **Zeqati**

Zeqati është një detyrim financiar për myslimanët që plotësojnë kushtet. Norma e përmendur zakonisht për pasurinë e përshtatshme është 2,5 %, sipas rregullave dhe pragut të Nisabit.`;
    }

    const hajjKeywords = [
        'haxh', 'haxhi', 'hajj', 'haj',
        'pelerinage', 'mecca', 'meke', 'qabe', 'kaaba'
    ];

    if (hajjKeywords.some((word) => clean.includes(word))) {
        if (lang === 'en') {
            return `🕋 **Hajj Pilgrimage**

Hajj is the pilgrimage to Mecca, obligatory once in a lifetime for Muslims who meet the relevant conditions and are able to perform it.`;
        }

        if (lang === 'fr') {
            return `🕋 **Pèlerinage du Hajj**

Le Hajj est le pèlerinage à La Mecque, obligatoire une fois dans la vie pour les musulmans qui remplissent les conditions et en ont la capacité.`;
        }

        return `🕋 **Haxhi**

Haxhi është pelegrinazhi në Mekë, i detyrueshëm një herë në jetë për myslimanët që plotësojnë kushtet dhe kanë mundësi ta kryejnë.`;
    }

    const pillarsKeywords = [
        'kushtet e islamit',
        'pillars of islam',
        "piliers de l islam",
        'shahada',
        'deshmia'
    ];

    if (pillarsKeywords.some((word) => clean.includes(word))) {
        if (lang === 'en') {
            return `🌟 **The Five Pillars of Islam**

1. Shahada — Declaration of faith
2. Salat — Prayer
3. Zakat — Obligatory charity
4. Sawm — Fasting
5. Hajj — Pilgrimage`;
        }

        if (lang === 'fr') {
            return `🌟 **Les cinq piliers de l'islam**

1. Shahada — Profession de foi
2. Salat — Prière
3. Zakat — Aumône obligatoire
4. Sawm — Jeûne
5. Hajj — Pèlerinage`;
        }

        return `🌟 **Pesë kushtet e Islamit**

1. Shahada — Dëshmia
2. Salat — Namazi
3. Zakat — Zeqati
4. Sawm — Agjërimi
5. Haxh — Pelegrinazhi`;
    }

    return null;
}

// -------------------------------------------------------------
// XSUS KNOWLEDGE SEARCH
// -------------------------------------------------------------
function checkKnowledge(userQuery, lang) {
    if (typeof searchKnowledge !== 'function') {
        return null;
    }

    try {
        const docs = searchKnowledge(userQuery, lang, 1);

        if (!Array.isArray(docs) || docs.length === 0) {
            return null;
        }

        const bestMatch = docs[0];

        if (!bestMatch || typeof bestMatch.content !== 'string') {
            return null;
        }

        const title = bestMatch.title || 'XSUS Knowledge';

        return `📚 **${title}**\n\n${bestMatch.content}`;
    } catch (error) {
        console.warn(
            'Gabim gjatë kërkimit në XSUS Knowledge:',
            error
        );

        return null;
    }
}

// -------------------------------------------------------------
// ROUTER KRYESOR
// -------------------------------------------------------------
export async function smartRouter(
    userQuery,
    lang = 'auto',
    moduleName = 'xsus-ai'
) {
    if (typeof userQuery !== 'string' || !userQuery.trim()) {
        return null;
    }

    const lowerQuery = userQuery.toLowerCase().trim();

    let albanianAnalysis = null;
    let grammarContext = '';

    // Analiza gramatikore nuk duhet të ndalojë ruterin në rast gabimi.
    try {
        albanianAnalysis = analyzeAlbanianGrammar(userQuery);

        if (albanianAnalysis) {
            const tokens = Array.isArray(albanianAnalysis.tokens)
                ? albanianAnalysis.tokens
                : [];

            grammarContext = JSON.stringify({
                language: albanianAnalysis.language,
                sentenceType: albanianAnalysis.sentenceType,
                hasNegation: albanianAnalysis.hasNegation,
                hasRequestMarker: albanianAnalysis.hasRequestMarker,
                tokens: tokens.map((token) => ({
                    word: token.text,
                    nounLemma: token.nounLemma,
                    verbLemma: token.verbLemma
                }))
            });
        }
    } catch (error) {
        console.warn(
            'Gabim gjatë analizës gramatikore:',
            error
        );
    }

    const tokens = Array.isArray(albanianAnalysis?.tokens)
        ? albanianAnalysis.tokens
        : [];

    const hasAlbanianTokens = tokens.some(
        (token) =>
            token.nounLemma != null ||
            token.verbLemma != null ||
            token.isNegation
    );

    const albanianMarkers = [
        'më jep', 'me jep', 'ngjyr', 'fjalëkalim',
        'fjalekalim', 'çfarë', 'cfare', 'në '
    ];

    const isAlbanianQuery =
        hasAlbanianTokens ||
        albanianMarkers.some((word) => lowerQuery.includes(word));

    let detectedLang = 'auto';

    try {
        detectedLang = detectQueryLanguage(userQuery) || 'auto';
    } catch (error) {
        console.warn('Gabim gjatë zbulimit të gjuhës:', error);
    }

    const activeLang = isAlbanianQuery
        ? 'sq'
        : (
            detectedLang !== 'auto'
                ? detectedLang
                : (lang === 'auto' || !lang ? 'en' : lang)
        );

    // -------------------------------------------------------------
    // UTILITET: NGJYRAT
    // -------------------------------------------------------------
    if (
        lowerQuery.includes('ngjyr') ||
        lowerQuery.includes('color') ||
        lowerQuery.includes('hex') ||
        (
            (lowerQuery.includes('më jep') || lowerQuery.includes('me jep')) &&
            lowerQuery.includes('rast')
        )
    ) {
        const randomHex = '#' +
            Math.floor(Math.random() * 16777215)
                .toString(16)
                .padStart(6, '0');

        if (activeLang === 'sq') {
            return `🎨 **Ngjyrë e rastësishme për dizajn**

- Kodi Hex: **${randomHex}**`;
        }

        return `🎨 **Random design color**

- Hex code: **${randomHex}**`;
    }

    // -------------------------------------------------------------
    // UTILITET: FJALËKALIME
    // -------------------------------------------------------------
    if (
        lowerQuery.includes('fjalëkalim') ||
        lowerQuery.includes('fjalekalim') ||
        lowerQuery.includes('fjalikalim') ||
        lowerQuery.includes('password')
    ) {
        const chars =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!';

        let password = '';

        // Shënim: për përdorim sigurie në prodhim, përdor një
        // gjenerator kriptografik të përshtatshëm.
        for (let index = 0; index < 14; index++) {
            password += chars.charAt(
                Math.floor(Math.random() * chars.length)
            );
        }

        if (activeLang === 'sq') {
            return `🔒 **Fjalëkalim i gjeneruar**

\`\`\`text
${password}
\`\`\`

Ruaje në një vend të sigurt.`;
        }

        return `🔒 **Generated password**

\`\`\`text
${password}
\`\`\`

Store it securely.`;
    }

    // -------------------------------------------------------------
    // BËRTHAMA QENDRORE
    // -------------------------------------------------------------
    try {
        if (studioCore && typeof studioCore.requestAccess === 'function') {
            const coreReply = studioCore.requestAccess(
                moduleName,
                userQuery,
                activeLang,
                { grammarContext }
            );

            if (coreReply) return coreReply;
        }
    } catch (error) {
        console.warn('Gabim te XSUS Core:', error);
    }

    // -------------------------------------------------------------
    // JAVA KNOWLEDGE
    // -------------------------------------------------------------
    try {
        const javaAnswer = checkJavaKnowledge(userQuery, activeLang);
        if (javaAnswer) return javaAnswer;
    } catch (error) {
        console.warn('Gabim te Java Knowledge:', error);
    }

    // -------------------------------------------------------------
    // ISLAMIC KNOWLEDGE
    // -------------------------------------------------------------
    try {
        const islamicAnswer = checkIslamicKnowledge(userQuery, activeLang);
        if (islamicAnswer) return islamicAnswer;
    } catch (error) {
        console.warn('Gabim te Islamic Knowledge:', error);
    }

    // -------------------------------------------------------------
    // SHËRBIMET EKZISTUESE
    // -------------------------------------------------------------
    const services = [
        ['sports', checkSports],
        ['weather', checkWeather],
        ['image generation', checkImageGeneration],
        ['QR code', checkQRCode],
        ['math', checkMath]
    ];

    for (const [name, service] of services) {
        if (typeof service !== 'function') continue;

        try {
            const result = await service(userQuery, activeLang);
            if (result) return result;
        } catch (error) {
            console.warn(`Gabim te shërbimi ${name}:`, error);
        }
    }

    // Njohuritë e personalizuara.
    try {
        if (typeof checkCustomKnowledge === 'function') {
            const custom = await checkCustomKnowledge(
                userQuery,
                activeLang
            );

            if (custom) return custom;
        }
    } catch (error) {
        console.warn('Gabim te Custom Knowledge:', error);
    }

    // -------------------------------------------------------------
    // XSUS KNOWLEDGE — BAZA E RE E JAVASCRIPT-IT PËRFSHIHET KËTU
    // -------------------------------------------------------------
    const knowledgeAnswer = checkKnowledge(userQuery, activeLang);

    if (knowledgeAnswer) {
        return knowledgeAnswer;
    }

    // Shërbimet e tjera vazhdojnë edhe nëse kërkimi i njohurive dështon.
    const remainingServices = [
        ['converter', checkConverter],
        ['translation', checkTranslation],
        ['finance', checkFinance],
        ['news', checkNews],
        ['notes', checkNotes],
        ['content ideas', checkContentIdeas],
        ['Wikipedia', checkWikipedia]
    ];

    for (const [name, service] of remainingServices) {
        if (typeof service !== 'function') continue;

        try {
            const result = await service(userQuery, activeLang);
            if (result) return result;
        } catch (error) {
            console.warn(`Gabim te shërbimi ${name}:`, error);
        }
    }

    return null;
}
