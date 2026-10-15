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

// Funksion për pastrimin e tekstit nga aksentet dhe hapat
function normalizeText(text) {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

export async function smartRouter(userQuery) {
    if (!userQuery) return null;
    const clean = normalizeText(userQuery);

    // -------------------------------------------------------------
    // 1. KONTROLLI I MENSËGJIHSHËM LOKAL (Ekzekutohet Pa Gabime)
    // -------------------------------------------------------------

    // A. Gjeneruesi i Fjalëkalimeve
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

    // B. Gjeneruesi i Ngjyrave Hex
    if (
        clean.includes("ngjyre") || 
        clean.includes("color") || 
        clean.includes("hex")
    ) {
        const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        return `🎨 **Ngjyrë e Rastësishme për Dizajn:**\n- Kodi Hex: **${randomHex}**\n- Ngjyra: <span style="background-color: ${randomHex}; padding: 2px 12px; border-radius: 4px; color: #fff; font-weight: bold;">${randomHex}</span>`;
    }

    // -------------------------------------------------------------
    // 2. SHËRBIMET E TJERA (Të mbrojtura me Try/Catch)
    // -------------------------------------------------------------
    try {
        if (typeof checkImageGeneration === 'function') {
            const imageAnswer = await checkImageGeneration(userQuery);
            if (imageAnswer) return imageAnswer;
        }
        if (typeof checkQRCode === 'function') {
            const qrAnswer = await checkQRCode(userQuery);
            if (qrAnswer) return qrAnswer;
        }
        if (typeof checkMath === 'function') {
            const mathAnswer = await checkMath(userQuery);
            if (mathAnswer) return mathAnswer;
        }
        if (typeof checkCustomKnowledge === 'function') {
            const customAnswer = checkCustomKnowledge(userQuery);
            if (customAnswer) return customAnswer;
        }
        if (typeof checkConverter === 'function') {
            const converterAnswer = await checkConverter(userQuery);
            if (converterAnswer) return converterAnswer;
        }
        if (typeof checkTranslation === 'function') {
            const translationAnswer = await checkTranslation(userQuery);
            if (translationAnswer) return translationAnswer;
        }
    } catch (err) {
        console.warn("Gabim në shërbimet sekondare të router-it:", err);
    }

    return null;
}
