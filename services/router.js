// services/router.js
import { loadCustomKnowledge, checkCustomKnowledge } from './custom-knowledge-service.js';
import { checkWikipedia } from './wikipedia-service.js';
import { checkNews } from './news-service.js';
import { checkWeather } from './weather-service.js';
import { checkFinance } from './finance-service.js';

loadCustomKnowledge();

export async function smartRouter(userQuery) {
    const query = userQuery.trim();
    if (!query) return null;

    // 1. Identiteti Xsus Studio
    const customAnswer = checkCustomKnowledge(query);
    if (customAnswer) return customAnswer;

    // 2. Financë (Kripto & Aksione)
    const financeAnswer = await checkFinance(query);
    if (financeAnswer) return financeAnswer;

    // 3. Moti live
    const weatherAnswer = await checkWeather(query);
    if (weatherAnswer) return weatherAnswer;

    // 4. Lajmet live
    const newsAnswer = await checkNews(query);
    if (newsAnswer) return newsAnswer;

    // 5. Wikipedia
    const wikiAnswer = await checkWikipedia(query);
    if (wikiAnswer) return wikiAnswer;

    return null;
}
