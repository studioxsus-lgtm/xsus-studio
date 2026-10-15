// services/core-knowledge.js - Bërthama e Njohurive për të Gjitha Modulet e Xsus Studio

export const xsusCoreKnowledge = {
    keywords: {
        sq: {
            "çfarë është xsus ai": "Xsus AI është sistemi i avancuar i inteligjencës artificiale i zhvilluar nga Xsus Studio, i dizajnuar për të ofruar zgjidhje të shpejta, gjenerim kodi, përkthime dhe ndihmë në zhvillimin e ueb-it.",
            "kush të ka krijuar": "Unë jam Xsus AI, një model hibrid neural i krijuar ekskluzivisht nga ekipi i Xsus Studio.",
            "përshëndetje": "Përshëndetje! Si mund t'ju ndihmoj sot me Xsus Studio?",
            "fjalor": "Bërthama lokale e Xsus AI përmban fjalorë të integruar në shqip, anglisht dhe frëngjisht për përgjigje të menjëhershme.",
            "xsus studio": "Xsus Studio është platforma inovative që zhvillon zgjidhje të avancuara dixhitale, aplikacione, faqe ueb dhe sisteme AI.",
            "xsus web": "Xsus Web është moduli i përkushtuar për ndërtimin e faqeve moderne të internetit, optimizimin e shpejtësisë dhe strukturave HTML/CSS/JS.",
            "xsus app": "Xsus App është moduli i dedikuar për zhvillimin e aplikacioneve mobile dhe desktop me performancë të lartë.",
            "xsus game": "Xsus Game mbulon motorët e lojërave, mekanikat interaktive dhe grafikën dixhitale.",
            "xsus logo": "Xsus Logo merret me krijimin e identitetit vizual, brendingut dhe grafikës vektoriale."
        },
        en: {
            "what is xsus ai": "Xsus AI is an advanced artificial intelligence system developed by Xsus Studio, designed to provide fast solutions, code generation, translations, and web development assistance.",
            "who created you": "I am Xsus AI, a hybrid neural model created exclusively by the Xsus Studio team.",
            "hello": "Hello! How can I help you today with Xsus Studio?",
            "dictionary": "The Xsus AI local core contains integrated dictionaries in Albanian, English, and French for instant responses.",
            "xsus studio": "Xsus Studio is an innovative platform developing advanced digital solutions, applications, websites, and AI systems.",
            "xsus web": "Xsus Web is dedicated to building modern websites, performance optimization, and HTML/CSS/JS structures.",
            "xsus app": "Xsus App is dedicated to high-performance mobile and desktop application development.",
            "xsus game": "Xsus Game covers game engines, interactive mechanics, and digital graphics.",
            "xsus logo": "Xsus Logo handles visual identity creation, branding, and vector graphics."
        },
        fr: {
            "qu'est-ce que xsus ai": "Xsus AI est un système d'intelligence artificielle avancé développé par Xsus Studio, conçu pour fournir des solutions rapides, la génération de code et l'assistance au développement web.",
            "qui t'a créé": "Je suis Xsus AI, un modèle neural hybride créé exclusivement par l'équipe de Xsus Studio.",
            "bonjour": "Bonjour ! Comment puis-je vous aider aujourd'hui avec Xsus Studio ?",
            "dictionnaire": "Le noyau local de Xsus AI contient des dictionnaires intégrés en albanais, anglais et français pour des réponses instantanées.",
            "xsus studio": "Xsus Studio est une plateforme innovante qui développe des solutions numériques avancées, des applications et des systèmes d'IA.",
            "xsus web": "Xsus Web est dédié à la création de sites web modernes, à l'optimisation des performances et aux structures HTML/CSS/JS.",
            "xsus app": "Xsus App est dédié au développement d'applications mobiles et de bureau haute performance.",
            "xsus game": "Xsus Game couvre les moteurs de jeu, les mécaniques interactives et les graphismes numériques.",
            "xsus logo": "Xsus Logo gère la création d'identité visuelle, le branding et les graphiques vectoriels."
        }
    },

    findInstantAnswer(cleanQuery, lang = 'sq') {
        const langDict = this.keywords[lang] || this.keywords['en'];

        for (const [key, answer] of Object.entries(langDict)) {
            if (cleanQuery.includes(key)) {
                return answer;
            }
        }
        return null;
    }
};
