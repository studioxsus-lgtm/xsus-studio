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
    console.warn("Gabim në ngarkimin e custom knowledge:", e);
}

// Funksion për pastrimin e tekstit nga aksentet (ë -> e, ç -> c)
function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// 1. Moduli Lokal: Gjenerues i Fjalëkalimeve
function checkPasswordGenerator(userQuery) {
    if (!userQuery) return null;
    const clean = normalizeText(userQuery);
    
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
    return null;
}

// 2. Moduli Lokal: Gjenerues i Ngjyrave Hex
function checkColorGenerator(userQuery) {
    if (!userQuery) return null;
    const clean = normalizeText(userQuery);
    
    if (
        clean.includes("ngjyre") || 
        clean.includes("color") || 
        clean.includes("hex")
    ) {
        const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        return `🎨 **Ngjyrë e Rastësishme për Dizajn:**\n- Kodi Hex: **${randomHex}**\n- Ngjyra: <span style="background-color: ${randomHex}; padding: 2px 12px; border-radius: 4px; color: #fff; font-weight: bold;">${randomHex}</span>`;
    }
    return null;
}

export async function smartRouter(userQuery) {
    if (!userQuery) return null;
    const query = userQuery.trim();

    // 1. Fjalëkalimi Lokal (Kapet i pari)
    const passwordAnswer = checkPasswordGenerator(query);
    if (passwordAnswer) return passwordAnswer;

    // 2. Ngjyra Hex Lokale
    const colorAnswer = checkColorGenerator(query);
    if (colorAnswer) return colorAnswer;

    // 3. Modulet e tjera
    if (typeof checkImageGeneration === 'function') {
        const imageAnswer = await checkImageGeneration(query);
        if (imageAnswer) return imageAnswer;
    }

    if (typeof checkQRCode === 'function') {
        const qrAnswer = await checkQRCode(query);
        if (qrAnswer) return qrAnswer;
    }

    if (typeof checkMath === 'function') {
        const mathAnswer = await checkMath(query);
        if (mathAnswer) return mathAnswer;
    }

    if (typeof checkCustomKnowledge === 'function') {
        const customAnswer = checkCustomKnowledge(query);
        if (customAnswer) return customAnswer;
    }

    if (typeof checkConverter === 'function') {
        const converterAnswer = await checkConverter(query);
        if (converterAnswer) return converterAnswer;
    }

    if (typeof checkTranslation === 'function') {
        const translationAnswer = await checkTranslation(query);
        if (translationAnswer) return translationAnswer;
    }

    return null;
}
