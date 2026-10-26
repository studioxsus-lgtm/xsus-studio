// services/router.js
// XSUS Studio — Smart Service Router
// Version: 2.4.0

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

// -------------------------------------------------------------
// KONFIGURIMI
// -------------------------------------------------------------

const DEFAULT_LANGUAGE = 'en';
const DEFAULT_MODULE = 'xsus-ai';

const SUPPORTED_LANGUAGES = new Set([
    'sq',
    'en',
    'fr'
]);

// -------------------------------------------------------------
// NGARKIMI I NJOHURIVE TË PERSONALIZUARA
// -------------------------------------------------------------

let customKnowledgeLoadPromise = null;

function initializeCustomKnowledge() {
    if (customKnowledgeLoadPromise) {
        return customKnowledgeLoadPromise;
    }

    try {
        customKnowledgeLoadPromise = Promise.resolve(
            loadCustomKnowledge()
        ).catch((error) => {
            console.warn(
                'Gabim gjatë ngarkimit të Custom Knowledge:',
                error
            );

            customKnowledgeLoadPromise = null;

            return null;
        });
    } catch (error) {
        console.warn(
            'Gabim gjatë inicializimit të Custom Knowledge:',
            error
        );

        customKnowledgeLoadPromise = null;

        return Promise.resolve(null);
    }

    return customKnowledgeLoadPromise;
}

// Ngarkimi fillestar pa bllokuar importimin.
void initializeCustomKnowledge();

// -------------------------------------------------------------
// NORMALIZIMI I TEKSTIT
// -------------------------------------------------------------

function normalizeText(value) {
    if (typeof value !== 'string') {
        return '';
    }

    try {
        return normalizeQueryText(value);
    } catch {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }
}

function includesAny(text, keywords) {
    return keywords.some((keyword) =>
        text.includes(normalizeText(keyword))
    );
}

function resolveLanguage(lang) {
    if (typeof lang === 'string') {
        const normalized = lang.toLowerCase().trim();

        if (SUPPORTED_LANGUAGES.has(normalized)) {
            return normalized;
        }
    }

    return DEFAULT_LANGUAGE;
}

function getLocalizedText(lang, sq, en, fr) {
    if (lang === 'fr') {
        return fr;
    }

    if (lang === 'en') {
        return en;
    }

    return sq;
}

// -------------------------------------------------------------
// GJENERIMI I SIGURT I FJALËKALIMEVE
// -------------------------------------------------------------

const PASSWORD_CHARACTERS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    'abcdefghijklmnopqrstuvwxyz' +
    '0123456789@#$%&*!';

function generateSecurePassword(length = 14) {
    if (
        !Number.isInteger(length) ||
        length < 1 ||
        length > 1024
    ) {
        throw new RangeError(
            'Gjatësia e fjalëkalimit është e pavlefshme.'
        );
    }

    const cryptoProvider = globalThis.crypto;

    if (
        !cryptoProvider ||
        typeof cryptoProvider.getRandomValues !== 'function'
    ) {
        throw new Error(
            'Web Crypto nuk është i disponueshëm.'
        );
    }

    let password = '';

    const limit =
        Math.floor(256 / PASSWORD_CHARACTERS.length) *
        PASSWORD_CHARACTERS.length;

    const buffer = new Uint8Array(
        Math.max(32, length * 2)
    );

    while (password.length < length) {
        cryptoProvider.getRandomValues(buffer);

        for (const value of buffer) {
            if (value >= limit) {
                continue;
            }

            password += PASSWORD_CHARACTERS[
                value % PASSWORD_CHARACTERS.length
            ];

            if (password.length === length) {
                break;
            }
        }
    }

    return password;
}

// -------------------------------------------------------------
// NGJYRA TË RASTËSISHME
// -------------------------------------------------------------

function generateRandomHexColor() {
    const cryptoProvider = globalThis.crypto;

    if (
        cryptoProvider &&
        typeof cryptoProvider.getRandomValues === 'function'
    ) {
        const buffer = new Uint8Array(3);

        cryptoProvider.getRandomValues(buffer);

        return (
            '#' +
            Array.from(buffer)
                .map((value) =>
                    value.toString(16).padStart(2, '0')
                )
                .join('')
        );
    }

    const value = Math.floor(
        Math.random() * 0x1000000
    );

    return '#' + value.toString(16).padStart(6, '0');
}

// -------------------------------------------------------------
// JAVA MASTER KNOWLEDGE
// -------------------------------------------------------------

function checkJavaKnowledge(userQuery, lang = 'sq') {
    if (
        typeof userQuery !== 'string' ||
        !Array.isArray(javaKnowledge)
    ) {
        return null;
    }

    const clean = normalizeText(userQuery);

    const match = javaKnowledge.find((item) => {
        if (!item || typeof item !== 'object') {
            return false;
        }

        const titleSq = normalizeText(
            item.title_sq || ''
        );

        const titleEn = normalizeText(
            item.title || ''
        );

        return (
            (titleSq && clean.includes(titleSq)) ||
            (titleEn && clean.includes(titleEn))
        );
    });

    if (!match) {
        return null;
    }

    if (lang === 'en') {
        return `### ☕ ${match.title || 'Java Knowledge'}

${match.content_en || match.content_sq || ''}

**💻 Code Example:**
\`\`\`java
${match.example || '// Java example'}
\`\`\``;
    }

    if (lang === 'fr') {
        return `### ☕ ${match.title || 'Connaissances Java'}

${match.content_fr || match.content_en || match.content_sq || ''}

**💻 Exemple de code :**
\`\`\`java
${match.example || '// Exemple Java'}
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
// NJOHURI ISLAMIKE
// -------------------------------------------------------------

function checkIslamicKnowledge(userQuery, lang = 'sq') {
    if (typeof userQuery !== 'string') {
        return null;
    }

    const clean = normalizeText(userQuery);

    const prayerKeywords = [
        'namaz',
        'falje',
        'orari i namazit',
        'sabah',
        'sabahu',
        'sabahit',
        'drek',
        'dreka',
        'drekes',
        'ikindi',
        'ikindia',
        'aksham',
        'akshami',
        'jaci',
        'jacia',
        'fejr',
        'dhuhr',
        'asr',
        'maghrib',
        'isha',
        'prayer times',
        'salat',
        'heures de priere',
        'priere',
        'fajr',
        'dhohr'
    ];

    if (includesAny(clean, prayerKeywords)) {
        return getLocalizedText(
            lang,
            `🕌 **Informacion mbi namazet**

- **Fajr / Sabahu:** Para lindjes së diellit.
- **Dhuhr / Dreka:** Mesdita.
- **Asr / Ikindia:** Pasdite.
- **Maghrib / Akshami:** Perëndimi i diellit.
- **Isha / Jacia:** Nata.

*Oraret e sakta varen nga vendndodhja dhe metoda e llogaritjes.*`,
            `🕌 **Daily Prayer Information**

- **Fajr:** Morning prayer before sunrise.
- **Dhuhr:** Midday prayer.
- **Asr:** Afternoon prayer.
- **Maghrib:** Sunset prayer.
- **Isha:** Night prayer.

*Exact times depend on your location and calculation method.*`,
            `🕌 **Informations sur les prières quotidiennes**

- **Fajr :** Prière du matin.
- **Dhuhr :** Prière de midi.
- **Asr :** Prière de l'après-midi.
- **Maghrib :** Prière du coucher du soleil.
- **Isha :** Prière de la nuit.

*Les horaires exacts dépendent de la localisation et de la méthode de calcul.*`
        );
    }

    const ramadanKeywords = [
        'ramazan',
        'ramadan',
        'agjerim',
        'agjerimi',
        'fasting',
        'jeune',
        'imsak',
        'iftar',
        'syfyr',
        'syfyri'
    ];

    if (includesAny(clean, ramadanKeywords)) {
        return getLocalizedText(
            lang,
            `🌙 **Ramazani dhe agjërimi**

Ramazani është muaji islam i agjërimit dhe përkushtimit. Agjërimi fillon në agim dhe përfundon në perëndim të diellit.`,
            `🌙 **Ramadan and Fasting**

Ramadan is the Islamic month of fasting and reflection. Fasting begins at dawn and ends at sunset.`,
            `🌙 **Ramadan et jeûne**

Le Ramadan est le mois islamique du jeûne et du recueillement. Le jeûne commence à l'aube et se termine au coucher du soleil.`
        );
    }

    const zakatKeywords = [
        'zeqat',
        'zeqati',
        'zekat',
        'zakat',
        'alms'
    ];

    if (includesAny(clean, zakatKeywords)) {
        return getLocalizedText(
            lang,
            `💰 **Zeqati**

Zeqati është një detyrim financiar për myslimanët që plotësojnë kushtet. Norma e përmendur zakonisht për pasurinë e përshtatshme është 2,5 %, sipas rregullave dhe pragut të Nisabit.`,
            `💰 **Zakat**

Zakat is an obligatory form of charity for eligible Muslims. The commonly cited rate for qualifying savings is 2.5%, subject to the applicable rules and Nisab threshold.`,
            `💰 **Zakat**

La zakat est une aumône obligatoire pour les musulmans concernés. Le taux couramment cité pour certains biens éligibles est de 2,5 %, selon les règles applicables et le seuil du Nisab.`
        );
    }

    const hajjKeywords = [
        'haxh',
        'haxhi',
        'hajj',
        'pelerinage',
        'mecca',
        'meke',
        'qabe',
        'kaaba'
    ];

    if (includesAny(clean, hajjKeywords)) {
        return getLocalizedText(
            lang,
            `🕋 **Haxhi**

Haxhi është pelegrinazhi në Mekë, i detyrueshëm një herë në jetë për myslimanët që plotësojnë kushtet dhe kanë mundësi ta kryejnë.`,
            `🕋 **Hajj Pilgrimage**

Hajj is the pilgrimage to Mecca, obligatory once in a lifetime for Muslims who meet the relevant conditions and are able to perform it.`,
            `🕋 **Pèlerinage du Hajj**

Le Hajj est le pèlerinage à La Mecque, obligatoire une fois dans la vie pour les musulmans qui remplissent les conditions et en ont la capacité.`
        );
    }

    const pillarsKeywords = [
        'kushtet e islamit',
        'pillars of islam',
        'piliers de l islam',
        'shahada',
        'deshmia'
    ];

    if (includesAny(clean, pillarsKeywords)) {
        return getLocalizedText(
            lang,
            `🌟 **Pesë kushtet e Islamit**

1. Shahada — Dëshmia
2. Salat — Namazi
3. Zakat — Zeqati
4. Sawm — Agjërimi
5. Haxh — Pelegrinazhi`,
            `🌟 **The Five Pillars of Islam**

1. Shahada — Declaration of faith
2. Salat — Prayer
3. Zakat — Obligatory charity
4. Sawm — Fasting
5. Hajj — Pilgrimage`,
            `🌟 **Les cinq piliers de l'islam**

1. Shahada — Profession de foi
2. Salat — Prière
3. Zakat — Aumône obligatoire
4. Sawm — Jeûne
5. Hajj — Pèlerinage`
        );
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

        if (
            !bestMatch ||
            typeof bestMatch.content !== 'string' ||
            !bestMatch.content.trim()
        ) {
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
// ZBULIMI I GJUHËS
// -------------------------------------------------------------

function detectActiveLanguage(userQuery, requestedLang, analysis) {
    const tokens = Array.isArray(analysis?.tokens)
        ? analysis.tokens
        : [];

    const hasAlbanianTokens = tokens.some(
        (token) =>
            token?.nounLemma != null ||
            token?.verbLemma != null ||
            token?.isNegation
    );

    const normalized = normalizeText(userQuery);

    const albanianMarkers = [
        'me jep',
        'ngjyr',
        'fjalekalim',
        'cfare',
        'pershendetje',
        'shpjego',
        'dua te'
    ];

    if (
        hasAlbanianTokens ||
        albanianMarkers.some((marker) =>
            normalized.includes(normalizeText(marker))
        )
    ) {
        return 'sq';
    }

    try {
        const detected = detectQueryLanguage(userQuery);

        if (
            typeof detected === 'string' &&
            SUPPORTED_LANGUAGES.has(detected.toLowerCase())
        ) {
            return detected.toLowerCase();
        }
    } catch (error) {
        console.warn(
            'Gabim gjatë zbulimit të gjuhës:',
            error
        );
    }

    return resolveLanguage(
        requestedLang === 'auto'
            ? DEFAULT_LANGUAGE
            : requestedLang
    );
}

// -------------------------------------------------------------
// ROUTER KRYESOR
// -------------------------------------------------------------

export async function smartRouter(
    userQuery,
    lang = 'auto',
    moduleName = DEFAULT_MODULE
) {
    if (
        typeof userQuery !== 'string' ||
        !userQuery.trim()
    ) {
        return null;
    }

    const query = userQuery.trim();
    const lowerQuery = normalizeText(query);

    let albanianAnalysis = null;
    let grammarContext = '';

    try {
        albanianAnalysis = analyzeAlbanianGrammar(query);

        if (albanianAnalysis) {
            const tokens = Array.isArray(albanianAnalysis.tokens)
                ? albanianAnalysis.tokens
                : [];

            grammarContext = JSON.stringify({
                language: albanianAnalysis.language ?? null,
                sentenceType: albanianAnalysis.sentenceType ?? null,
                hasNegation: Boolean(
                    albanianAnalysis.hasNegation
                ),
                hasRequestMarker: Boolean(
                    albanianAnalysis.hasRequestMarker
                ),
                tokens: tokens.map((token) => ({
                    word: token?.text ?? '',
                    nounLemma: token?.nounLemma ?? null,
                    verbLemma: token?.verbLemma ?? null,
                    isNegation: Boolean(token?.isNegation)
                }))
            });
        }
    } catch (error) {
        console.warn(
            'Gabim gjatë analizës gramatikore:',
            error
        );
    }

    const activeLang = detectActiveLanguage(
        query,
        lang,
        albanianAnalysis
    );

    // ---------------------------------------------------------
    // MOTI — KONTROLLI PARA XSUS CORE
    // ---------------------------------------------------------

    try {
        const weatherAnswer = await checkWeather(
            query,
            activeLang
        );

        if (
            typeof weatherAnswer === 'string' &&
            weatherAnswer.trim()
        ) {
            return weatherAnswer;
        }
    } catch (error) {
        console.warn(
            'Gabim te shërbimi i motit:',
            error
        );
    }

    // ---------------------------------------------------------
    // UTILITET: NGJYRAT
    // ---------------------------------------------------------

    const colorKeywords = [
        'ngjyr',
        'color',
        'colour',
        'hex code',
        'hex color',
        'random color',
        'random colour'
    ];

    const asksForRandomColor =
        colorKeywords.some((keyword) =>
            lowerQuery.includes(normalizeText(keyword))
        ) ||
        (
            (
                lowerQuery.includes('me jep')
            ) &&
            lowerQuery.includes('rast')
        );

    if (asksForRandomColor) {
        const hex = generateRandomHexColor();

        return getLocalizedText(
            activeLang,
            `🎨 **Ngjyrë e rastësishme për dizajn**\n\n- Kodi Hex: **${hex}**`,
            `🎨 **Random design color**\n\n- Hex code: **${hex}**`,
            `🎨 **Couleur aléatoire pour le design**\n\n- Code Hex : **${hex}**`
        );
    }

    // ---------------------------------------------------------
    // UTILITET: FJALËKALIME
    // ---------------------------------------------------------

    const passwordKeywords = [
        'fjalekalim',
        'fjalikalim',
        'password',
        'generate a password',
        'create a password',
        'mot de passe',
        'generer un mot de passe'
    ];

    if (
        passwordKeywords.some((keyword) =>
            lowerQuery.includes(normalizeText(keyword))
        )
    ) {
        let password;

        try {
            password = generateSecurePassword(14);
        } catch (error) {
            console.error(
                'Nuk u krijua dot fjalëkalimi i sigurt:',
                error
            );

            return getLocalizedText(
                activeLang,
                'Nuk mund të krijoj një fjalëkalim të sigurt në këtë mjedis. Provo një shfletues që mbështet Web Crypto.',
                'A secure password could not be generated in this environment. Please use a browser that supports Web Crypto.',
                'Impossible de générer un mot de passe sécurisé dans cet environnement. Utilisez un navigateur compatible avec Web Crypto.'
            );
        }

        return getLocalizedText(
            activeLang,
            `🔒 **Fjalëkalim i gjeneruar**\n\n\`\`\`text\n${password}\n\`\`\`\n\nRuaje në një vend të sigurt.`,
            `🔒 **Generated password**\n\n\`\`\`text\n${password}\n\`\`\`\n\nStore it securely.`,
            `🔒 **Mot de passe généré**\n\n\`\`\`text\n${password}\n\`\`\`\n\nConservez-le dans un endroit sûr.`
        );
    }

    // ---------------------------------------------------------
    // XSUS CORE
    // ---------------------------------------------------------

    try {
        if (
            studioCore &&
            typeof studioCore.requestAccess === 'function'
        ) {
            const coreReply = await studioCore.requestAccess(
                moduleName || DEFAULT_MODULE,
                query,
                activeLang,
                { grammarContext }
            );

            if (
                typeof coreReply === 'string' &&
                coreReply.trim()
            ) {
                return coreReply;
            }
        }
    } catch (error) {
        console.warn('Gabim te XSUS Core:', error);
    }

    // ---------------------------------------------------------
    // JAVA KNOWLEDGE
    // ---------------------------------------------------------

    try {
        const javaAnswer = checkJavaKnowledge(
            query,
            activeLang
        );

        if (javaAnswer) {
            return javaAnswer;
        }
    } catch (error) {
        console.warn('Gabim te Java Knowledge:', error);
    }

    // ---------------------------------------------------------
    // NJOHURI ISLAMIKE
    // ---------------------------------------------------------

    try {
        const islamicAnswer = checkIslamicKnowledge(
            query,
            activeLang
        );

        if (islamicAnswer) {
            return islamicAnswer;
        }
    } catch (error) {
        console.warn('Gabim te Islamic Knowledge:', error);
    }

    // ---------------------------------------------------------
    // SHËRBIMET E SPECIALIZUARA
    // ---------------------------------------------------------

    const specializedServices = [
        ['sports', checkSports],
        ['image generation', checkImageGeneration],
        ['QR code', checkQRCode],
        ['math', checkMath]
    ];

    for (const [name, service] of specializedServices) {
        if (typeof service !== 'function') {
            continue;
        }

        try {
            const result = await service(query, activeLang);

            if (result) {
                return result;
            }
        } catch (error) {
            console.warn(
                `Gabim te shërbimi ${name}:`,
                error
            );
        }
    }

    // ---------------------------------------------------------
    // CUSTOM KNOWLEDGE
    // ---------------------------------------------------------

    try {
        await initializeCustomKnowledge();

        if (typeof checkCustomKnowledge === 'function') {
            const customAnswer = await checkCustomKnowledge(
                query,
                activeLang
            );

            if (customAnswer) {
                return customAnswer;
            }
        }
    } catch (error) {
        console.warn(
            'Gabim te Custom Knowledge:',
            error
        );
    }

    // ---------------------------------------------------------
    // XSUS KNOWLEDGE
    // ---------------------------------------------------------

    const knowledgeAnswer = checkKnowledge(
        query,
        activeLang
    );

    if (knowledgeAnswer) {
        return knowledgeAnswer;
    }

    // ---------------------------------------------------------
    // SHËRBIMET E TJERA
    // ---------------------------------------------------------

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
        if (typeof service !== 'function') {
            continue;
        }

        try {
            const result = await service(query, activeLang);

            if (result) {
                return result;
            }
        } catch (error) {
            console.warn(
                `Gabim te shërbimi ${name}:`,
                error
            );
        }
    }

    return null;
}
