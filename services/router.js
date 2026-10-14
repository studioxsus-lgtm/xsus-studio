// services/router.js
import { loadCustomKnowledge, checkCustomKnowledge } from './custom-knowledge-service.js';
import { checkWikipedia } from './wikipedia-service.js';
import { checkNews } from './news-service.js';
import { checkWeather } from './weather-service.js';
import { checkFinance } from './finance-service.js';
import { checkTranslation } from './translation-service.js';

loadCustomKnowledge();

export async function smartRouter(userQuery) {
    const query = userQuery.trim();
    if (!query) return null;

    // 1. Identiteti Xsus Studio
    const customAnswer = checkCustomKnowledge(query);
    if (customAnswer) return customAnswer;

    // 2. Përkthyesi i Avancuar
    const translationAnswer = await checkTranslation(query);
    if (translationAnswer) return translationAnswer;

    // 3. Financë (Kripto & Aksione)
    const financeAnswer = await checkFinance(query);
    if (financeAnswer) return financeAnswer;

    // 4. Moti live
    const weatherAnswer = await checkWeather(query);
    if (weatherAnswer) return weatherAnswer;

    // 5. Lajmet live
    const newsAnswer = await checkNews(query);
    if (newsAnswer) return newsAnswer;

    // 6. Wikipedia
    const wikiAnswer = await checkWikipedia(query);
    if (wikiAnswer) return wikiAnswer;

    return null;
}
