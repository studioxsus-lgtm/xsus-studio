// services/router.js
import { studioCore } from './xsus-core.js';
import { loadCustomKnowledge, checkCustomKnowledge } from './custom-knowledge-service.js';
import { searchKnowledge } from './knowledge-service.js';
import { javaKnowledge } from './javaKnowledge.js';
import { detectQueryLanguage, normalizeQueryText } from './language-engine.js';
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

try {
    loadCustomKnowledge();
} catch (e) {
    console.warn("Gabim te custom knowledge:", e);
}

// Moduli i Njohurive Teknike & Java Master Engine
function checkJavaKnowledge(userQuery, lang = 'sq') {
    if (!userQuery || !Array.isArray(javaKnowledge)) return null;
    const clean = normalizeQueryText(userQuery);

    const match = javaKnowledge.find(item => {
        const titleSqClean = normalizeQueryText(item.title_sq || "");
        const titleEnClean = normalizeQueryText(item.title || "");
        return (
            (titleSqClean && clean.includes(titleSqClean)) ||
            (titleEnClean && clean.includes(titleEnClean))
        );
    });

    if (match) {
        if (lang === 'en') {
            return `### ☕ ${match.title}\n\n${match.content_en}\n\n**💻 Code Example:**\n\`\`\`java\n${match.example || '// Advanced Enterprise Java Code'}\n\`\`\``;
        }
        return `### ☕ ${match.title_sq}\n\n${match.content_sq}\n\n**💻 Shembull Kodi:**\n\`\`\`java\n${match.example || '// Kod i avancuar Enterprise Java'}\n\`\`\``;
    }
    return null;
}

// Moduli Islamik Multilingval (AL / EN / FR)
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
        'prayer times', 'salat', 'heures de priere', 'priere', 'fajr', 'dhohr'
    ];
    
    if (prayerKeywords.some(kw => clean.includes(kw))) {
        if (lang === 'en') {
            return `🕌 **Daily Prayer Information**\n\n* **Fajr:** Morning prayer (before sunrise).\n* **Dhuhr:** Midday prayer.\n* **Asr:** Afternoon prayer.\n* **Maghrib:** Sunset prayer.\n* **Isha:** Night prayer.\n\n*Note: Exact times depend on your geographical location.*`;
        } else if (lang === 'fr') {
            return `🕌 **Informations sur les prières quotidiennes**\n\n* **Fajr:** Prière du matin.\n* **Dhuhr:** Prière du midi.\n* **Asr:** Prière de l'après-midi.\n* **Maghrib:** Prière du coucher du soleil.\n* **Isha:** Prière de la nuit.`;
        }
        return `🕌 **Informacion mbi Namazet (Daily Prayers)**\n\n` +
               `* **🌅 Fajr / Sabahu:** Para lindjes së diellit.\n` +
               `* **☀️ Dhuhr / Dreka:** Mesdita.\n` +
               `* **⛅ Asr / Ikindia:** Pasdite.\n` +
               `* **🌅 Maghrib / Akshami:** Perëndimi i diellit.\n` +
               `* **🌌 Isha / Jacia:** Nata.\n\n` +
               `💡 *Namazi është shtylla e dytë e Islamit. Oraret e sakta varen nga vendndodhja jote.*`;
    }

    const ramadanKeywords = ['ramazan', 'ramadan', 'agjerim', 'agjerimi', 'fasting', 'jeune', 'imsak', 'iftar', 'syfyr', 'syfyri'];
    if (ramadanKeywords.some(kw => clean.includes(kw))) {
        if (lang === 'en') {
            return `🌙 **Ramadan & Fasting**\nRamadan is the holy month of fasting and self-reflection, lasting from dawn (Suhoor) to sunset (Iftar).`;
        }
        return `🌙 **Ramazani & Agjërimi**\nRamazani është muaji i shenjtë i agjërimit dhe devotshmërisë. Agjërimi zgjat nga Imsaku (syfyri) deri në Aksham (iftari).`;
    }

    const zakatKeywords = ['zeqat', 'zeqati', 'zekat', 'zakat', 'alms'];
    if (zakatKeywords.some(kw => clean.includes(kw))) {
        if (lang === 'en') {
            return `💰 **Zakat**\nZakat is a mandatory annual charity (2.5%) on qualifying wealth above the Nisab threshold.`;
        }
        return `💰 **Zeqati**\nZeqati është detyrim vjetor financiar (2.5%) mbi pasurinë që kalon nivelin e caktuar (Nisabin).`;
    }

    const hajjKeywords = ['haxh', 'haxhi', 'hajj', 'haj', 'pelerinage', 'mecca', 'meke', 'qabe', 'kaaba'];
    if (hajjKeywords.some(kw => clean.includes(kw))) {
        if (lang === 'en') {
            return `🕋 **Hajj Pilgrimage**\nHajj is the sacred pilgrimage to Mecca, mandatory once in a lifetime for those who are able.`;
        }
        return `🕋 **Haxhi**\nHaxhi është udhëtimi i shenjtë në Mekë, i obligueshëm për çdo musliman që ka mundësi.`;
    }

    const pillarsKeywords = ['kushtet e islamit', 'pillars of islam', 'piliers de l islam', 'shahada', 'deshmia'];
    if (pillarsKeywords.some(kw => clean.includes(kw))) {
        return `🌟 **5 Kushtet e Islamit (5 Pillars of Islam)**\n1. Shahada (Dëshmia)\n2. Salat (Namazi)\n3. Zakat (Zeqati)\n4. Sawm (Agjërimi)\n5. Hajj (Haxhi)`;
    }

    return null;
}

export async function smartRouter(userQuery, lang = 'auto', moduleName = 'xsus-ai') {
    if (!userQuery) return null;

    const lowerQuery = userQuery.toLowerCase();
    const clean = normalizeQueryText(userQuery);

    // Kapim çfarëdo varianti të fjalëve shqip
    const isAlbanianQuery = lowerQuery.includes('më jep') || 
                            lowerQuery.includes('me jep') || 
                            lowerQuery.includes('ngjyr') || 
                            lowerQuery.includes('rast') || 
                            lowerQuery.includes('fjalëkalim') || 
                            lowerQuery.includes('fjalekalim') || 
                            lowerQuery.includes('çfarë') || 
                            lowerQuery.includes('cfare') || 
                            lowerQuery.includes('si');

    const detectedLang = detectQueryLanguage(userQuery);
    const activeLang = isAlbanianQuery ? 'sq' : (detectedLang && detectedLang !== 'auto' ? detectedLang : (lang === 'auto' || !lang ? 'en' : lang));

    // -------------------------------------------------------------
    // PRIORITET ABSOLUT 1: UTILITETET LOKALE (Ngjyra, Fjalëkalim)
    // -------------------------------------------------------------
    if (
        clean.includes("ngjyr") || 
        clean.includes("color") || 
        clean.includes("hex")
    ) {
        const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        if (activeLang === 'sq' || isAlbanianQuery) {
            return `🎨 **Ngjyrë e Rastësishme për Dizajn:**\n- Kodi Hex: **${randomHex}**\n- Ngjyra: <span style="background-color: ${randomHex}; padding: 2px 12px; border-radius: 4px; color: #fff; font-weight: bold;">${randomHex}</span>`;
        }
        return `🎨 **Random Color for Design:**\n- Hex Code: **${randomHex}**\n- Color: <span style="background-color: ${randomHex}; padding: 2px 12px; border-radius: 4px; color: #fff; font-weight: bold;">${randomHex}</span>`;
    }

    if (
        clean.includes("fjalekalim") || 
        clean.includes("fjalikalim") || 
        clean.includes("password") || 
        clean.includes("pass")
    ) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!";
        let pass = "";
        for (let i = 0; i < 14; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (activeLang === 'sq' || isAlbanianQuery) {
            return `🔒 **Fjalëkalim i Sigurt i Gjeneruar:**\n\`\`\`text\n${pass}\n\`\`\`\n*(Kopjoje dhe ruaje në një vend të sigurt!)*`;
        }
        return `🔒 **Secure Generated Password:**\n\`\`\`text\n${pass}\n\`\`\`\n*(Copy and save it in a safe place!)*`;
    }

    // -------------------------------------------------------------
    // 0. BËRTHAMA QENDRORE (Xsus Studio Core Engine)
    // -------------------------------------------------------------
    try {
        if (studioCore && typeof studioCore.requestAccess === 'function') {
            const coreReply = studioCore.requestAccess(moduleName, userQuery, activeLang);
            if (coreReply) return coreReply;
        }
    } catch (coreErr) {
        console.warn("Gabim te Bërthama Qendrore (xsus-core):", coreErr);
    }

    const javaAnswer = checkJavaKnowledge(userQuery, activeLang);
    if (javaAnswer) return javaAnswer;

    const islamicAnswer = checkIslamicKnowledge(userQuery, activeLang);
    if (islamicAnswer) return islamicAnswer;

    // -------------------------------------------------------------
    // 2. SHËRBIMET EKZISTUESE
    // -------------------------------------------------------------
    try {
        if (typeof checkSports === 'function') {
            const sports = await checkSports(userQuery, activeLang);
            if (sports) return sports;
        }
        if (typeof checkWeather === 'function') {
            const weather = await checkWeather(userQuery, activeLang);
            if (weather) return weather;
        }
        if (typeof checkImageGeneration === 'function') {
            const img = await checkImageGeneration(userQuery, activeLang);
            if (img) return img;
        }
        if (typeof checkQRCode === 'function') {
            const qr = await checkQRCode(userQuery, activeLang);
            if (qr) return qr;
        }
        if (typeof checkMath === 'function') {
            const math = await checkMath(userQuery, activeLang);
            if (math) return math;
        }
        if (typeof checkCustomKnowledge === 'function') {
            const custom = checkCustomKnowledge(userQuery, activeLang);
            if (custom) return custom;
        }
        if (typeof searchKnowledge === 'function') {
            const docs = searchKnowledge(userQuery, activeLang, 1);
            if (docs && docs.length > 0) {
                return `📚 **${docs[0].title}**\n\n${docs[0].content}`;
            }
        }
        if (typeof checkConverter === 'function') {
            const conv = await checkConverter(userQuery, activeLang);
            if (conv) return conv;
        }
        if (typeof checkTranslation === 'function') {
            const tr = await checkTranslation(userQuery, activeLang);
            if (tr) return tr;
        }
        if (typeof checkFinance === 'function') {
            const fin = await checkFinance(userQuery, activeLang);
            if (fin) return fin;
        }
        if (typeof checkNews === 'function') {
            const news = await checkNews(userQuery, activeLang);
            if (news) return news;
        }
        if (typeof checkNotes === 'function') {
            const notes = await checkNotes(userQuery, activeLang);
            if (notes) return notes;
        }
        if (typeof checkContentIdeas === 'function') {
            const ideas = await checkContentIdeas(userQuery, activeLang);
            if (ideas) return ideas;
        }
        if (typeof checkWikipedia === 'function') {
            const wiki = await checkWikipedia(userQuery, activeLang);
            if (wiki) return wiki;
        }
    } catch (err) {
        console.warn("Gabim gjatë ekzekutimit të moduleve sekondare:", err);
    }

    return null;
}
