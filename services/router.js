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

export async function smartRouter(userQuery) {
    const query = userQuery.trim();
    if (!query) return null;

    // 1. Gjeneruesi i Imazheve
    const imageAnswer = await checkImageGeneration(query);
    if (imageAnswer) return imageAnswer;

    // 2. Moduli i Kuisit (Ekzekutohet menjëherë lokalisht)
    const quizAnswer = checkLocalQuiz(query);
    if (quizAnswer) return quizAnswer;

    // 3. Gjeneruesi i Kodeve QR
    const qrAnswer = await checkQRCode(query);
    if (qrAnswer) return qrAnswer;

    // 4. Llogaritjet Matematikore
    const mathAnswer = await checkMath(query);
    if (mathAnswer) return mathAnswer;

    // 5. Identiteti Xsus Studio
    const customAnswer = checkCustomKnowledge(query);
    if (customAnswer) return customAnswer;

    // 6. Konvertuesi i Njësive
    const converterAnswer = await checkConverter(query);
    if (converterAnswer) return converterAnswer;

    // 7. Përkthyesi
    const translationAnswer = await checkTranslation(query);
    if (translationAnswer) return translationAnswer;

    // 8. Financë
    const financeAnswer = await checkFinance(query);
    if (financeAnswer) return financeAnswer;

    // 9. Moti
    const weatherAnswer = await checkWeather(query);
    if (weatherAnswer) return weatherAnswer;

    // 10. Lajmet
    const newsAnswer = await checkNews(query);
    if (newsAnswer) return newsAnswer;

    // 11. Sporti
    const sportsAnswer = await checkSports(query);
    if (sportsAnswer) return sportsAnswer;

    // 12. Shënimet
    const notesAnswer = await checkNotes(query);
    if (notesAnswer) return notesAnswer;

    // 13. Idetë
    const ideasAnswer = await checkContentIdeas(query);
    if (ideasAnswer) return ideasAnswer;

    // 14. Wikipedia
    const wikiAnswer = await checkWikipedia(query);
    if (wikiAnswer) return wikiAnswer;

    return null;
}
