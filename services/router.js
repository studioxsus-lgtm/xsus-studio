// services/router.js
import { loadCustomKnowledge, checkCustomKnowledge } from './custom-knowledge-service.js';
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

// Funksion për pastrimin e tekstit nga aksentet (ë -> e, ç -> c)
function normalizeText(text) {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// Moduli i Sportit Live
function checkSportLive(userQuery) {
    if (!userQuery) return null;
    const clean = normalizeText(userQuery);
    
    if (
        clean.includes("sport") || 
        clean.includes("ndeshje") || 
        clean.includes("futboll") || 
        clean.includes("rezultate") ||
        clean.includes("live")
    ) {
        return `⚽ **Xsus Sport Live Hub:**\n\n` +
               `- **Ndeshjet Kryesore sot:** Përditësimet live janë aktive në rrjet.\n` +
               `- **Kampionatet:** Champions League, Premier League, Serie A, La Liga.\n\n` +
               `💡 *Shkruaj emrin e një skuadre ose kampionati specifik për të marrë detaje të tjera!*`;
    }
    return null;
}

export async function smartRouter(userQuery) {
    if (!userQuery) return null;
    const clean = normalizeText(userQuery);

    // -------------------------------------------------------------
    // 1. UTILITETET LOKALE (Fjalëkalim, Ngjyra, Sport Live)
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

    const sportAnswer = checkSportLive(userQuery);
    if (sportAnswer) return sportAnswer;

    // -------------------------------------------------------------
    // 2. TË GJITHA SHËRBIMET E TJERA EKZISTUESE
    // -------------------------------------------------------------
    try {
        if (typeof checkImageGeneration === 'function') {
            const img = await checkImageGeneration(userQuery);
            if (img) return img;
        }
        if (typeof checkQRCode === 'function') {
            const qr = await checkQRCode(userQuery);
            if (qr) return qr;
        }
        if (typeof checkMath === 'function') {
            const math = await checkMath(userQuery);
            if (math) return math;
        }
        if (typeof checkCustomKnowledge === 'function') {
            const custom = checkCustomKnowledge(userQuery);
            if (custom) return custom;
        }
        if (typeof checkConverter === 'function') {
            const conv = await checkConverter(userQuery);
            if (conv) return conv;
        }
        if (typeof checkTranslation === 'function') {
            const tr = await checkTranslation(userQuery);
            if (tr) return tr;
        }
        if (typeof checkFinance === 'function') {
            const fin = await checkFinance(userQuery);
            if (fin) return fin;
        }
        if (typeof checkWeather === 'function') {
            const weather = await checkWeather(userQuery);
            if (weather) return weather;
        }
        if (typeof checkNews === 'function') {
            const news = await checkNews(userQuery);
            if (news) return news;
        }
        if (typeof checkSports === 'function') {
            const sports = await checkSports(userQuery);
            if (sports) return sports;
        }
        if (typeof checkNotes === 'function') {
            const notes = await checkNotes(userQuery);
            if (notes) return notes;
        }
        if (typeof checkContentIdeas === 'function') {
            const ideas = await checkContentIdeas(userQuery);
            if (ideas) return ideas;
        }
        if (typeof checkWikipedia === 'function') {
            const wiki = await checkWikipedia(userQuery);
            if (wiki) return wiki;
        }
    } catch (err) {
        console.warn("Gabim gjatë ekzekutimit të moduleve sekondare:", err);
    }

    return null;
}
