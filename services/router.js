// services/router.js
import { loadCustomKnowledge, checkCustomKnowledge } from './custom-knowledge-service.js';
import { checkWikipedia } from './wikipedia-service.js';
import { checkNews } from './news-service.js';
import { checkWeather } from './weather-service.js';
import { checkFinance } from './finance-service.js';
// Hiq përkohësisht: import { checkCodeRequest } from './code-service.js';

loadCustomKnowledge();

export async function smartRouter(userQuery) {
    const query = userQuery.trim();
    if (!query) return null;

    const customAnswer = checkCustomKnowledge(query);
    if (customAnswer) return customAnswer;

    // Hiq përkohësisht:
    // const codeAnswer = checkCodeRequest(query);
    // if (codeAnswer) return codeAnswer;

    const financeAnswer = await checkFinance(query);
    if (financeAnswer) return financeAnswer;

    const weatherAnswer = await checkWeather(query);
    if (weatherAnswer) return weatherAnswer;

    const newsAnswer = await checkNews(query);
    if (newsAnswer) return newsAnswer;

    const wikiAnswer = await checkWikipedia(query);
    if (wikiAnswer) return wikiAnswer;

    return null;
}
