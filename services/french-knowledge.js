// services/fr-knowledge.js - Bërthama e Njohurive në Gjuhën Frënge (Français)

export const frKnowledge = {
    "qu'est-ce que xsus ai": "Xsus AI est un système d'intelligence artificielle avancé développé par Xsus Studio, conçu pour fournir des solutions rapides, la génération de code et l'assistance au développement web.",
    "qui t'a créé": "Je suis Xsus AI, un modèle neural hybride créé exclusivement par l'équipe de Xsus Studio.",
    "bonjour": "Bonjour ! Comment puis-je vous aider aujourd'hui avec Xsus Studio ?",
    "dictionnaire": "Le noyau local de Xsus AI contient des dictionnaires intégrés pour des réponses instantanées.",
    "xsus studio": "Xsus Studio est une plateforme innovante qui développe des solutions numériques avancées, des applications et des systèmes d'IA.",
    "xsus web": "Xsus Web est dédié à la création de sites web modernes, à l'optimisation des performances et aux structures HTML/CSS/JS.",
    "xsus app": "Xsus App est dédié au développement d'applications mobiles et de bureau haute performance."
};

export function findFrAnswer(cleanQuery) {
    for (const [key, answer] of Object.entries(frKnowledge)) {
        if (cleanQuery.includes(key)) {
            return answer;
        }
    }
    return null;
}
