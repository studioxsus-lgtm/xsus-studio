// services/en-knowledge.js - Bërthama e Njohurive në Gjuhën Angleze (English)

export const enKnowledge = {
    "what is xsus ai": "Xsus AI is an advanced artificial intelligence system developed by Xsus Studio, designed to provide fast solutions, code generation, translations, and web development assistance.",
    "who created you": "I am Xsus AI, a hybrid neural model created exclusively by the Xsus Studio team.",
    "hello": "Hello! How can I help you today with Xsus Studio?",
    "dictionary": "The Xsus AI local core contains integrated dictionaries for instant responses.",
    "xsus studio": "Xsus Studio is an innovative platform developing advanced digital solutions, applications, websites, and AI systems.",
    "xsus web": "Xsus Web is dedicated to building modern websites, performance optimization, and HTML/CSS/JS structures.",
    "xsus app": "Xsus App is dedicated to high-performance mobile and desktop application development."
};

export function findEnAnswer(cleanQuery) {
    for (const [key, answer] of Object.entries(enKnowledge)) {
        if (cleanQuery.includes(key)) {
            return answer;
        }
    }
    return null;
}
