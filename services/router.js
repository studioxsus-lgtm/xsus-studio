// services/router.js
import { loadCustomKnowledge, checkCustomKnowledge } from './custom-knowledge-service.js';
import { checkWikipedia } from './wikipedia-service.js';

// Inicializojmë të dhënat custom
loadCustomKnowledge();

export async function smartRouter(userQuery) {
    const query = userQuery.trim();
    if (!query) return null;

    // 1. PRIORITETI I PARË: Marka dhe njohuritë tona (Xsus Studio, Kallabak, etj.)
    const customAnswer = checkCustomKnowledge(query);
    if (customAnswer) {
        return customAnswer;
    }

    // 2. PRIORITETI I DYTË: Kërkim live në Wikipedia për çdo pyetje enciklopedike
    const wikiAnswer = await checkWikipedia(query);
    if (wikiAnswer) {
        return wikiAnswer;
    }

    // 3. Përndryshe, kalon te modeli kryesor i AI-it (Pollinations)
    return null;
}
