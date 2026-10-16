// services/router.js
import { studioCore } from './xsus-core.js';
import { loadCustomKnowledge, checkCustomKnowledge } from './custom-knowledge-service.js';
import { searchKnowledge } from './knowledge-service.js'; // Integrimi i kërkimit shumëgjuhësh të artikujve
import { javaKnowledge } from './javaKnowledge.js'; // Integrimi i bazës Master të njohurive
import { detectQueryLanguage, normalizeQueryText } from './language-engine.js'; // Motorri i ri i gjuhës
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
function checkJavaKnowledge(userQuery) {
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
        return `### ☕ ${match.title_sq} /${match.title}\n\n` +
               `**🇦🇱 Shqip:**\n${match.content_sq}\n\n` +
               `**🇬🇧 English:**\n${match.content_en}\n\n` +
               `**💻 Shembull Kodi / Code Example:**\n\`\`\`java\n${match.example || '// Kod i avancuar Enterprise Java'}\n\`\`\``;
    }
    return null;
}

// Moduli Islamik Multilingval (AL / EN / FR)
function checkIslamicKnowledge(userQuery) {
    if (!userQuery) return null;
    const clean = normalizeQueryText(userQuery);

    // 1. ORARET & NAMAZET (Prayers)
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
        return `🕌 **Informacion mbi Namazet (Daily Prayers / Prières quotidiennes)**\n\n` +
               `* **🌅 Fajr / Sabahu:** Prière du matin (para lindjes së diellit / before sunrise).\n` +
               `* **☀️ Dhuhr / Dreka:** Prière du midi (mesdita / midday).\n` +
               `* **⛅ Asr / Ikindia:** Prière de l'après-midi (pasdite / afternoon).\n` +
               `* **🌅 Maghrib / Akshami:** Prière du coucher du soleil (perëndimi i diellit / sunset).\n` +
               `* **🌌 Isha / Jacia:** Prière de la nuit (nata / night).\n\n` +
               `---\n` +
               `💡 **Të dhëna të dobishme / Useful info:**\n` +
               `* **SQ:** Namazi është shtylla e dytë e Islamit. Oraret e sakta varen nga vendndodhja jote gjeografike.\n` +
               `* **EN:** Prayer is the second pillar of Islam. Exact times depend on your geographical location.\n` +
               `* **FR:** La prière est le deuxième pilier de l'Islam. Les horaires exacts dépendent de votre position géographique.`;
    }

    // 2. RAMAZANI & AGJËRIMI (Ramadan & Fasting)
    const ramadanKeywords = ['ramazan', 'ramadan', 'agjerim', 'agjerimi', 'fasting', 'jeune', 'imsak', 'iftar', 'syfyr', 'syfyri'];
    if (ramadanKeywords.some(kw => clean.includes(kw))) {
        return `🌙 **Ramazani & Agjërimi (Ramadan & Fasting / Le Jeûne)**\n\n` +
               `* **🇦🇱 Shqip:** Ramazani është muaji i shenjtë i agjërimit, vetëpërmbajtjes dhe devotshmërisë. Agjërimi zgjat nga Imsaku (syfyri) deri në Aksham (iftari).\n` +
               `* **🇬🇧 English:** Ramadan is the holy month of fasting, self-reflection, and prayer. Fasting lasts from dawn (Imsak/Suhoor) to sunset (Iftar).\n` +
               `* **🇫🇷 Français:** Le Ramadan est le mois sacré du jeûne, de la prière et du partage. Le jeûne dure de l'aube (Imsak/Suhoor) au coucher du soleil (Iftar).\n\n` +
               `---\n` +
               `✨ **Të mirat e Ramazanit / Benefits:**\n` +
               `* Pastrim shpirtëror dhe trupor (Spiritual & physical purification).\n` +
               `* Ndihmë për të varfërit dhe solidaritet (Charity & solidarity).`;
    }

    // 3. ZEQATI (Zakat / Financial Charity)
    const zakatKeywords = ['zeqat', 'zeqati', 'zekat', 'zakat', 'alms'];
    if (zakatKeywords.some(kw => clean.includes(kw))) {
        return `💰 **Zeqati (Zakat - Financial Obligations & Charity)**\n\n` +
               `* **🇦🇱 Shqip:** Zeqati është detyrim vjetor financiar (2.5%) mbi pasurinë që kalon nivelin e caktuar (Nisabin), për t'iu dhënë të varfërve dhe të nevojtarëve.\n` +
               `* **🇬🇧 English:** Zakat is a mandatory annual charity (2.5%) on qualifying wealth above the Nisab threshold, distributed to those in need.\n` +
               `* **🇫🇷 Français:** La Zakat est l'aumône obligatoire annuelle (2,5%) sur la richesse dépassant le seuil du Nisab, destinée aux personnes nécessiteuses.`;
    }

    // 4. HAXHI (Hajj / Pilgrimage)
    const hajjKeywords = ['haxh', 'haxhi', 'hajj', 'haj', 'pelerinage', 'mecca', 'meke', 'qabe', 'kaaba'];
    if (hajjKeywords.some(kw => clean.includes(kw))) {
        return `🕋 **Haxhi (Hajj Pilgrimage / Le Pèlerinage)**\n\n` +
               `* **🇦🇱 Shqip:** Haxhi është udhëtimi i shenjtë në Mekë, i obligueshëm të paktën një herë në jetë për çdo musliman që ka mundësi financiare dhe shëndetësore.\n` +
               `* **🇬🇧 English:** Hajj is the sacred pilgrimage to Mecca, mandatory once in a lifetime for every adult Muslim who is physically and financially able.\n` +
               `* **🇫🇷 Français:** Le Hajj est le pèlerinage sacré à La Mecque, obligatoire une fois dans la vie pour tout musulman qui en a les moyens physiques et financiers.`;
    }

    // 5. KUSHTET E ISLAMIT (5 Pillars of Islam)
    const pillarsKeywords = ['kushtet e islamit', 'pillars of islam', 'piliers de l islam', 'shahada', 'deshmia'];
    if (pillarsKeywords.some(kw => clean.includes(kw))) {
        return `🌟 **5 Kushtet e Islamit (5 Pillars of Islam / Les 5 Piliers de l'Islam)**\n\n` +
               `1. **Shahada (Dëshmia / Testimony):** Besimi në një Zot të Vetëm (Allah) dhe Muhamedin a.s. si të dërguar të Tij.\n` +
               `2. **Salat (Namazi / Prayer):** Kryerja e 5 namazeve ditore.\n` +
               `3. **Zakat (Zeqati / Almsgiving):** Dhënia e lëmoshës vjetore prej 2.5%.\n` +
               `4. **Sawm (Agjërimi / Fasting):** Agjërimi i muajit të Ramazanit.\n` +
               `5. **Hajj (Haxhi / Pilgrimage):** Udhëtimi në Mekë për ata që kanë mundësi.`;
    }

    return null;
}

export async function smartRouter(userQuery, lang = 'auto', moduleName = 'xsus-ai') {
    if (!userQuery) return null;

    // 1. Zbulimi automatik i gjuhës nëse nuk kaloi e zgjedhur
    const activeLang = lang === 'auto' || !lang ? detectQueryLanguage(userQuery) : lang;

    // -------------------------------------------------------------
    // 0. BËRTHAMA QENDRORE (Xsus Studio Core Engine - 0ms Response)
    // -------------------------------------------------------------
    try {
        if (studioCore && typeof studioCore.requestAccess === 'function') {
            const coreReply = studioCore.requestAccess(moduleName, userQuery, activeLang);
            if (coreReply) return coreReply;
        }
    } catch (coreErr) {
        console.warn("Gabim te Bërthama Qendrore (xsus-core):", coreErr);
    }

    const clean = normalizeQueryText(userQuery);

    // -------------------------------------------------------------
    // 1. UTILITETET LOKALE (Fjalëkalim, Ngjyra, Java, Moduli Islamik)
    // -------------------------------------------------------------
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
        return `🔒 **Fjalëkalim i Sigurt i Gjeneruar:**\n\`\`\`text\n${pass}\n\`\`\`\n*(Kopjoje dhe ruaje në një vend të sigurt!)*`;
    }

    if (
        clean.includes("ngjyre") || 
        clean.includes("color") || 
        clean.includes("hex")
    ) {
        const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        return `🎨 **Ngjyrë e Rastësishme për Dizajn:**\n- Kodi Hex: **${randomHex}**\n- Ngjyra: <span style="background-color: ${randomHex}; padding: 2px 12px; border-radius: 4px; color: #fff; font-weight: bold;">${randomHex}</span>`;
    }

    const javaAnswer = checkJavaKnowledge(userQuery);
    if (javaAnswer) return javaAnswer;

    const islamicAnswer = checkIslamicKnowledge(userQuery);
    if (islamicAnswer) return islamicAnswer;

    // -------------------------------------------------------------
    // 2. TË GJITHA SHËRBIMET E TJERA EKZISTUESE
    // -------------------------------------------------------------
    try {
        // 1. Kontrolli i Sportit (ndeshje live & renditje)
        if (typeof checkSports === 'function') {
            const sports = await checkSports(userQuery, activeLang);
            if (sports) return sports;
        }
        // 2. Kontrolli i Motit (temperatuat & parashikimi)
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
        // Kontrolli i Bazës së Artikujve / Njohurive të Përgjithshme
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
