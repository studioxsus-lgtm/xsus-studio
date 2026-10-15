// services/core-knowledge.js - Bërthama e Njohurive në Gjuhën Shqipe

export const sqKnowledge = {
    "çfarë është xsus ai": "Xsus AI është sistemi i avancuar i inteligjencës artificiale i zhvilluar nga Xsus Studio, i dizajnuar për të ofruar zgjidhje të shpejta, gjenerim kodi, përkthime dhe ndihmë në zhvillimin e ueb-it.",
    "kush të ka krijuar": "Unë jam Xsus AI, një model hibrid neural i krijuar ekskluzivisht nga ekipi i Xsus Studio.",
    "përshëndetje": "Përshëndetje! Si mund t'ju ndihmoj sot me Xsus Studio?",
    "fjalor": "Bërthama lokale e Xsus AI përmban fjalorë të integruar për përgjigje të menjëhershme.",
    "xsus studio": "Xsus Studio është platforma inovative që zhvillon zgjidhje të avancuara dixhitale, aplikacione, faqe ueb dhe sisteme AI.",
    "xsus web": "Xsus Web është moduli i përkushtuar për ndërtimin e faqeve moderne të internetit, optimizimin e shpejtësisë dhe strukturave HTML/CSS/JS.",
    "xsus app": "Xsus App është moduli i dedikuar për zhvillimin e aplikacioneve mobile dhe desktop me performancë të lartë."
};

export const coreKnowledge = {
    findInstantAnswer(cleanQuery) {
        for (const [key, answer] of Object.entries(sqKnowledge)) {
            if (cleanQuery.includes(key)) {
                return answer;
            }
        }
        return null;
    }
};
