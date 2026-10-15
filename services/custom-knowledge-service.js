// services/custom-knowledge-service.js

let customData = [];

// Funksion për pastrimin e tekstit nga aksentet
function normalizeText(text) {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

export async function loadCustomKnowledge() {
    try {
        const res = await fetch('services/data/xsus-ecosystem.json');
        if (res.ok) {
            const json = await res.json();
            if (json.items) {
                customData.push(...json.items);
                console.log("Custom Knowledge u ngarkua me sukses nga JSON!");
            }
        }
    } catch (e) {
        console.warn("Gabim në ngarkimin e Custom Knowledge nga JSON:", e);
    }
}

export function checkCustomKnowledge(userQuery) {
    if (!userQuery) return null;
    const clean = normalizeText(userQuery);

    // 1. KONTROLLI NGA SKEDARI JSON (Dinamik)
    for (const item of customData) {
        const match = item.keywords.some(kw => clean.includes(normalizeText(kw)));
        if (match) {
            return item.answer;
        }
    }

    // 2. NJOHURITË E DEDIKUARA TOKËSORE (0ms Statike)

    // A. Xsus Studio & Xsus AI
    if (clean.includes("xsus") || clean.includes("xsus studio") || clean.includes("xsus ai") || clean.includes("cfare eshte xsus")) {
        return `🚀 **Xsus Studio & Xsus AI**\n\n` +
               `**Xsus Studio** është një platformë dixhitalo-teknologjike e avancuar, e integruar me inteligjencë artificiale (**Xsus AI**), e projektuar për të ofruar shërbime të shpejta, mjete zhvillimi, dhe asistencë inteligjente në kohë reale.\n\n` +
               `✨ **Karakteristikat kryesore:**\n` +
               `- **Arkitekturë Hibride:** Përgjigje ultra të shpejta (0ms) për utilitete, financa, fe, sport, dhe përkthime.\n` +
               `- **Ndërfaqe Cyber Glassmorphism:** Dizajn modern, i lehtë dhe responsive për mobil e desktop.\n` +
               `- **Zhvillim i Pavarur:** Me plane për bazë të dhënash të dedikuar dhe backend privat.`;
    }

    // B. Programim & Ueb Development
    if (clean.includes("html")) {
        return `🌐 **HTML (HyperText Markup Language)**\n\n` +
               `HTML është gjuha standarde e strukturimit të faqeve ueb. Ajo përdor etiketa (tags) si \`<div>\`, \`<h1>\`, \`<p>\`, dhe \`<a>\` për të ndërtuar skeletin e një uebsajti.`;
    }

    if (clean.includes("css")) {
        return `🎨 **CSS (Cascading Style Sheets)**\n\n` +
               `CSS përdoret për stilimin dhe dizajnimin e faqeve ueb (ngjyrat, fontet, marzhet, Glassmorphism, Flexbox, CSS Grid). Ajo e kthen strukturën HTML në një ndërfaqe vizuale atraktive.`;
    }

    if (clean.includes("javascript") || clean.includes("js")) {
        return `⚡ **JavaScript (JS)**\n\n` +
               `JavaScript është gjuha kryesore e programimit për uebin. Ajo i jep interaktivitet faqeve ueb (menaxhimi i ngjarjeve, thirrjet API, përpunimi i të dhënave në shfletues apo në server përmes Node.js).`;
    }

    if (clean.includes("react")) {
        return `⚛️ **React.js**\n\n` +
               `React është një bibliotekë e fuqishme JavaScript e zhvilluar nga Meta për ndërtimin e ndërfaqeve të përdoruesit (UI) bazuar në komponentë të ripërdorshëm (Reusable Components).`;
    }

    if (clean.includes("node") || clean.includes("nodejs")) {
        return `🟢 **Node.js**\n\n` +
               `Node.js është një mjedis ekzekutimi (runtime environment) që lejon ekzekutimin e kodit JavaScript në anën e serverit (Backend), duke mundësuar ndërtimin e API-ve të shpejta dhe skalueshme.`;
    }

    if (clean.includes("git") || clean.includes("github")) {
        return `🐙 **Git & GitHub**\n\n` +
               `* **Git:** Sistem kontrolli i versioneve (Version Control System) për të gjurmuar ndryshimet në kod.\n` +
               `* **GitHub:** Platformë cloud për ruajtjen, menaxhimin dhe bashkëpunimin në projekte programimi.`;
    }

    // C. AI & Prompting
    if (clean.includes("inteligjence artificiale") || clean.includes("cfare eshte ai") || clean.includes("what is ai")) {
        return `🤖 **Inteligjenca Artificiale (AI)**\n\n` +
               `AI është fusha e shkencës kompjuterike që merret me krijimin e sistemeve të aftë për të kryer detyra që zakonisht kërkojnë inteligjencë njerëzore, si: përpunimi i gjuhës natyrore, njohja e imazheve, marrja e vendimeve dhe zgjidhja e problemeve.`;
    }

    if (clean.includes("prompt") || clean.includes("prompt engineering")) {
        return `✍️ **Prompt Engineering**\n\n` +
               `Prompt Engineering është arti dhe teknika e formulimit të udhëzimeve (prompts) të sakta për modelet e AI me qëllim marrjen e përgjigjeve më cilësore, më të sakta dhe më relevante.`;
    }

    // D. Biznes & SaaS
    if (clean.includes("saas")) {
        return `☁️ **SaaS (Software as a Service)**\n\n` +
               `SaaS është një model shpërndarjeje softueri ku aplikacioni hostohet në cloud dhe u ofrohet përdoruesve përmes internetit me pajtim (subscription model), pa pasur nevojë për instalim lokal.`;
    }

    if (clean.includes("seo")) {
        return `🔍 **SEO (Search Engine Optimization)**\n\n` +
               `SEO është procesi i optimizimit të një uebsajti për të rritur dukshmërinë dhe renditjen e tij në motorët e kërkimit si Google, duke sjellë trafik organik pa pagesë.`;
    }

    // E. Shkencë & Gjeografi
    if (clean.includes("sistemi diellor") || clean.includes("planetet")) {
        return `🌌 **Sistemi Diellor**\n\n` +
               `Sistemi ynë diellor përbëhet nga Dielli dhe 8 planetët që rrotullohen rreth tij: **Mërkuri, Venusa, Toka, Marsi, Jupiteri, Saturni, Urani, dhe Neptuni**.`;
    }

    if (clean.includes("kryeqyteti i shqiperise") || clean.includes("kryeqyteti i kosoves")) {
        return `🏛️ **Kryeqytetet Shqiptare:**\n\n` +
               `* Kryeqyteti i Shqipërisë është **Tirana**.\n` +
               `* Kryeqyteti i Kosovës është **Prishtina**.`;
    }

    return null;
}
