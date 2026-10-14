// services/router.js
import { loadCustomKnowledge, checkCustomKnowledge } from './custom-knowledge-service.js';
import { checkWikipedia } from './wikipedia-service.js';
import { checkNews } from './news-service.js';

// Inicializojmë të dhënat custom
loadCustomKnowledge();

export async function smartRouter(userQuery) {
    const query = userQuery.trim();
    if (!query) return null;

    // 1. PRIORITETI I PARË: Identiteti dhe ekosistemi Xsus Studio
    const customAnswer = checkCustomKnowledge(query);
    if (customAnswer) {
        return customAnswer;
    }

    // 2. PRIORITETI I DYTË: Lajmet e fundit globale / ndërkombëtare
    const newsAnswer = await checkNews(query);
    if (newsAnswer) {
        return newsAnswer;
    }

    // 3. PRIORITETI I TRETË: Kërkim enciklopedik në Wikipedia
    const wikiAnswer = await checkWikipedia(query);
    if (wikiAnswer) {
        return wikiAnswer;
    }

    // 4. Përndryshe, kalon te motori kryesor i AI-it (Pollinations)
    return null;
}
