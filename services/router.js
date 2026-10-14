// services/router.js
import { loadCustomKnowledge, checkCustomKnowledge } from './custom-knowledge-service.js';

// Inicializojmë ngarkimin e të dhënave sapo të nisë aplikacioni
loadCustomKnowledge();

export async function smartRouter(userQuery) {
    const query = userQuery.trim();
    if (!query) return null;

    // 1. PRIORITETI I PARË: Informacioni i dhënë nga NE (Custom Knowledge Base)
    const customAnswer = checkCustomKnowledge(query);
    if (customAnswer) {
        return customAnswer;
    }

    // 2. Këtu më vonë do të shtojmë shërbimet e tjera live (Wikipedia, Moti, Kripto, etj.)
    
    return null;
}
