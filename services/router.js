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

loadCustomKnowledge();

// Quiz local
const localQuizQuestions = [
    {
        category: "Gjeografi",
        question: "Cili është kryeqyteti i Belgjikës?",
        options: ["A) Paris", "B) Brukseli", "C) Amsterdami", "D) Berlini"],
        answer: "B"
    },
    {
        category: "Teknologji",
        question: "Çfarë do të thotë akronimi 'AI' në teknologji?",
        options: ["A) Automated Interface", "B) Artificial Intelligence", "C) Advanced Internet", "D) Access Information"],
        answer: "B"
    }
];

function checkLocalQuiz(userQuery) {
    if (!userQuery) return null;
    const lower = userQuery.trim().toLowerCase();
    
    if (lower.includes("kuis") || lower.includes("quiz") || lower.includes("pyetje")) {
        const randomIndex = Math.floor(Math.random() * localQuizQuestions.length);
        const q = localQuizQuestions[randomIndex];
        return `❓ **Pyetje Kuis [${q.category}]**\n\n**${q.question}**\n\n${q.options.join("\n")}\n\n---\n💡 *Zgjidh opsionin e saktë (A, B, C, D) ose shkruaj 'kuis' për pyetjen tjetër!*`;
    }
    return null;
}

// Générateur de mot de passe local (supporte les accents et variantes)
function checkPasswordGenerator(userQuery) {
    if (!userQuery) return null;
    const lower = userQuery.trim().toLowerCase();
    
    if (
        lower.includes("fjalëkalim") || 
        lower.includes("fjalekalim") || 
        lower.includes("password") || 
        lower.includes("pass")
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

// Générateur de couleur Hex local
function checkColorGenerator(userQuery) {
    if (!userQuery) return null;
    const lower = userQuery.trim().toLowerCase();
    
    if (
        lower.includes("ngjyrë") || 
        lower.includes("ngjyre") || 
        lower.includes("color") || 
        lower.includes("hex")
    ) {
        const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        return `🎨 **Ngjyrë e Rastësishme për Dizajn:**\n- Kodi Hex: **${randomHex}**\n- Ngjyra: <span style="background-color: ${randomHex}; padding: 2px 12px; border-radius: 4px; color: #fff; font-weight: bold;">${randomHex}</span>`;
    }
    return null;
}

export async function smartRouter(userQuery) {
    if (!userQuery) return null;
    const query = userQuery.trim();

    // 1. Mot de passe local
    const passwordAnswer = checkPasswordGenerator(query);
    if (passwordAnswer) return passwordAnswer;

    // 2. Couleur Hex locale
    const colorAnswer = checkColorGenerator(query);
    if (colorAnswer) return colorAnswer;

    // 3. Générateur d'images
    const imageAnswer = await checkImageGeneration(query);
    if (imageAnswer) return imageAnswer;

    // 4. Quiz
    const quizAnswer = checkLocalQuiz(query);
    if (quizAnswer) return quizAnswer;

    // 5. Code QR
    const qrAnswer = await checkQRCode(query);
    if (qrAnswer) return qrAnswer;

    // 6. Mathématiques
    const mathAnswer = await checkMath(query);
    if (mathAnswer) return mathAnswer;

    // 7. Connaissances Xsus Studio
    const customAnswer = checkCustomKnowledge(query);
    if (customAnswer) return customAnswer;

    // 8. Convertisseur
    const converterAnswer = await checkConverter(query);
    if (converterAnswer) return converterAnswer;

    // 9. Traduction
    const translationAnswer = await checkTranslation(query);
    if (translationAnswer) return translationAnswer;

    // 10. Finance
    const financeAnswer = await checkFinance(query);
    if (financeAnswer) return financeAnswer;

    // 11. Météo
    const weatherAnswer = await checkWeather(query);
    if (weatherAnswer) return weatherAnswer;

    // 12. Actualités
    const newsAnswer = await checkNews(query);
    if (newsAnswer) return newsAnswer;

    // 13. Sports
    const sportsAnswer = await checkSports(query);
    if (sportsAnswer) return sportsAnswer;

    // 14. Notes
    const notesAnswer = await checkNotes(query);
    if (notesAnswer) return notesAnswer;

    // 15. Idées
    const ideasAnswer = await checkContentIdeas(query);
    if (ideasAnswer) return ideasAnswer;

    // 16. Wikipédia
    const wikiAnswer = await checkWikipedia(query);
    if (wikiAnswer) return wikiAnswer;

    return null;
}
