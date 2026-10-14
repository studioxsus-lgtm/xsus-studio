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

export async function smartRouter(userQuery) {
    const query = userQuery.trim();
    if (!query) return null;

    // 1. Gjeneruesi i Imazheve
    const imageAnswer = await checkImageGeneration(query);
    if (imageAnswer) return imageAnswer;

    // 2. Identiteti Xsus Studio
    const customAnswer = checkCustomKnowledge(query);
    if (customAnswer) return customAnswer;

    // 3. Konvertuesi i Njësive & Valutave
    const converterAnswer = await checkConverter(query);
    if (converterAnswer) return converterAnswer;

    // 4. Llogaritjet Matematikore & Përqindjet (Lokal)
    const mathAnswer = await checkMath(query);
    if (mathAnswer) return mathAnswer;

    // 5. Gjeneruesi i Kodeve QR (Lokal)
    const qrAnswer = await checkQRCode(query);
    if (qrAnswer) return qrAnswer;

    // 6. Përkthyesi
    const translationAnswer = await checkTranslation(query);
    if (translationAnswer) return translationAnswer;

    // 7. Financë & Kurse Valutore Live
    const financeAnswer = await checkFinance(query);
    if (financeAnswer) return financeAnswer;

    // 8. Moti live
    const weatherAnswer = await checkWeather(query);
    if (weatherAnswer) return weatherAnswer;

    // 9. Lajmet live
    const newsAnswer = await checkNews(query);
    if (newsAnswer) return newsAnswer;

    // 10. Lajmet Sportive Live
    const sportsAnswer = await checkSports(query);
    if (sportsAnswer) return sportsAnswer;

    // 11. Shënimet & Përkujtuesit (Lokal)
    const notesAnswer = await checkNotes(query);
    if (notesAnswer) return notesAnswer;

    // 12. Ide për Përmbajtje & Skenare
    const ideasAnswer = await checkContentIdeas(query);
    if (ideasAnswer) return ideasAnswer;

    // 13. Wikipedia
    const wikiAnswer = await checkWikipedia(query);
    if (wikiAnswer) return wikiAnswer;

    return null;
}
