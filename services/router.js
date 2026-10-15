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

// Lista e pyetjeve të kuisit të integruara direkt këtu
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
    },
    {
        category: "Sport",
        question: "Sa lojtarë ka një ekip futbolli në fushë gjatë lojës?",
        options: ["A) 9", "B) 10", "C) 11", "D) 12"],
        answer: "C"
    },
    {
        category: "Dituri e Përgjithshme",
        question: "Cili është planeti më i madh në sistemin tonë diellor?",
        options: ["A) Marsi", "B) Toka", "C) Jupiteri", "D) Saturni"],
        answer: "C"
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

// Mjet Lokal: Gjenerues i Fjalëkalimeve
function checkPasswordGenerator(userQuery) {
    if (!userQuery) return null;
    const lower = userQuery.trim().toLowerCase();
    if (lower.includes("fjalëkalim") || lower.includes("password")) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!";
        let pass = "";
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `🔒 **Fjalëkalim i Sigurt i Gjeneruar:**\n\`\`\`text\n${pass}\n\`\`\`\n*(Kopjoje dhe ruaje në një vend të sigurt!)*`;
    }
    return null;
}

// Mjet Lokal: Gjenerues i Ngjyrave Hex
function checkColorGenerator(userQuery) {
    if (!userQuery) return null;
    const lower = userQuery.trim().toLowerCase();
    if (lower.includes("ngjyrë") || lower.includes("color") || lower.includes("hex")) {
        const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        return `🎨 **Ngjyrë e Rastësishme për Dizajn:**\n- Kodi Hex: **${randomHex}**\n- Ngjyra: <span style="background-color: ${randomHex}; padding: 2px 12px; border-radius: 4px; color: #fff; font-weight: bold;">${randomHex}</span>`;
    }
    return null;
}

export async function smartRouter(userQuery) {
    const query = userQuery.trim();
    if (!query) return null;

    // 1. Gjeneruesi i Imazheve
    const imageAnswer = await checkImageGeneration(query);
    if (imageAnswer) return imageAnswer;

    // 2. Moduli i Kuisit
    const quizAnswer = checkLocalQuiz(query);
    if (quizAnswer) return quizAnswer;

    // 3. Gjeneruesi i Fjalëkalimeve (Lokal)
    const passwordAnswer = checkPasswordGenerator(query);
    if (passwordAnswer) return passwordAnswer;

    // 4. Gjeneruesi i Ngjyrave Hex (Lokal)
    const colorAnswer = checkColorGenerator(query);
    if (colorAnswer) return colorAnswer;

    // 5. Gjeneruesi i Kodeve QR
    const qrAnswer = await checkQRCode(query);
    if (qrAnswer) return qrAnswer;

    // 6. Llogaritjet Matematikore
    const mathAnswer = await checkMath(query);
    if (mathAnswer) return mathAnswer;

    // 7. Identiteti Xsus Studio
    const customAnswer = checkCustomKnowledge(query);
    if (customAnswer) return customAnswer;

    // 8. Konvertuesi i Njësive
    const converterAnswer = await checkConverter(query);
    if (converterAnswer) return converterAnswer;

    // 9. Përkthyesi
    const translationAnswer = await checkTranslation(query);
    if (translationAnswer) return translationAnswer;

    // 10. Financë
    const financeAnswer = await checkFinance(query);
    if (financeAnswer) return financeAnswer;

    // 11. Moti
    const weatherAnswer = await checkWeather(query);
    if (weatherAnswer) return weatherAnswer;

    // 12. Lajmet
    const newsAnswer = await checkNews(query);
    if (newsAnswer) return newsAnswer;

    // 13. Sporti
    const sportsAnswer = await checkSports(query);
    if (sportsAnswer) return sportsAnswer;

    // 14. Shënimet
    const notesAnswer = await checkNotes(query);
    if (notesAnswer) return notesAnswer;

    // 15. Idetë
    const ideasAnswer = await checkContentIdeas(query);
    if (ideasAnswer) return ideasAnswer;

    // 16. Wikipedia
    const wikiAnswer = await checkWikipedia(query);
    if (wikiAnswer) return wikiAnswer;

    return null;
}
