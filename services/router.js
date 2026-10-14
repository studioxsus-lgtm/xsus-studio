// services/router.js
import { loadCustomKnowledge, checkCustomKnowledge } from './custom-knowledge-service.js';
import { checkWikipedia } from './wikipedia-service.js';
import { checkNews } from './news-service.js';
import { checkWeather } from './weather-service.js';
import { checkFinance } from './finance-service.js';
import { checkTranslation } from './translation-service.js';
import { checkConverter } from './converter-service.js';

loadCustomKnowledge();

export async function smartRouter(userQuery) {
    const query = userQuery.trim();
    if (!query) return null;

    // 1. Identiteti Xsus Studio
    const customAnswer = checkCustomKnowledge(query);
    if (customAnswer) return customAnswer;

    // 2. Konvertuesi i Njësive & Valutave
    const converterAnswer = await checkConverter(query);
    if (converterAnswer) return converterAnswer;

    // 3. Përkthyesi
    const translationAnswer = await checkTranslation(query);
    if (translationAnswer) return translationAnswer;

    // 4. Financë & Kurse Valutore Live
    const financeAnswer = await checkFinance(query);
    if (financeAnswer) return financeAnswer;

    // 5. Moti live
    const weatherAnswer = await checkWeather(query);
    if (weatherAnswer) return weatherAnswer;

    // 6. Lajmet live
    const newsAnswer = await checkNews(query);
    if (newsAnswer) return newsAnswer;

    // 7. Wikipedia
    const wikiAnswer = await checkWikipedia(query);
    if (wikiAnswer) return wikiAnswer;

    return null;
}
