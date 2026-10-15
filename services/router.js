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

export async function smartRouter(userQuery) {
    if (!userQuery) return null;
    const text = userQuery.toLowerCase().trim();

    // -------------------------------------------------------------
    // 0. KONTROLLI I PARË DHE ABSOLUT: FJALËKALIMI
    // (Ky bllok vendoset këtu që asnjë shërbim tjetër të mos e ndalojë)
    // -------------------------------------------------------------
    if (
        text.includes("fjal") || 
        text.includes("kalim") || 
        text.includes("password") || 
        text.includes("pass") ||
        text.includes("fjalekalim")
    ) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!";
        let pass = "";
        for (let i = 0; i < 14; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `🔒 **Fjalëkalim i Sigurt i Gjeneruar:**\n\`\`\`text\n${pass}\n\`\`\`\n*(Kopjoje dhe ruaje në një vend të sigurt!)*`;
    }

    // -------------------------------------------------------------
    // 1. GJENERUESI I NGJYRAVE HEX
    // -------------------------------------------------------------
    if (
        text.includes("ngjyr") || 
        text.includes("ngjyre") || 
        text.includes("color") || 
        text.includes("hex")
    ) {
        const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        return `🎨 **Ngjyrë e Rastësishme për Dizajn:**\n- Kodi Hex: **${randomHex}**\n- Ngjyra: <span style="background-color: ${randomHex}; padding: 2px 12px; border-radius: 4px; color: #fff; font-weight: bold;">${randomHex}</span>`;
    }

    // -------------------------------------------------------------
    // 2. SHËRBIMET E TJERA
    // -------------------------------------------------------------
    try {
        if (typeof checkCustomKnowledge === 'function') {
            const custom = checkCustomKnowledge(userQuery);
            if (custom) return custom;
        }
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
        if (typeof checkConverter === 'function') {
            const conv = await checkConverter(userQuery);
            if (conv) return conv;
        }
        if (typeof checkTranslation === 'function') {
            const tr = await checkTranslation(userQuery);
            if (tr) return tr;
        }
    } catch (err) {
        console.warn("Gabim në router:", err);
    }

    return null;
}
