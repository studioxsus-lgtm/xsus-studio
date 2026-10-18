
import { smartRouter } from './services/router.js';

const translations = {
    en: {
        heroBadge: "Official Hybrid Intelligence Platform",
        heroTitle: 'The most powerful digital tools in a <span class="gradient-text">Single Studio</span>',
        heroBefore: "The most powerful digital tools in a",
        heroHighlight: "Single Studio",
        heroSub: "Explore our independent digital tools, designed for performance, creativity and productivity.",
        subtitle: "Explore our independent digital tools, designed for performance, creativity and productivity.",
        navAi: "Xsus AI",
        navApp: "Xsus App",
        navWeb: "Xsus Web",
        navGame: "Xsus Game",
        navLogo: "Xsus Logo",
        navDomain: "Xsus Domain",
        login: "Login",
        signup: "Sign Up",
        logout: "Logout",
        cardAi: "Smart assistant for text generation, video scripts, analysis, and coding.",
        cardApp: "Mobile and web application builder, live previews, and theme customization.",
        cardWeb: "Modern web design, multi-file architectures, and hosting solutions.",
        cardGame: "Interactive browser gaming experiences and physics engines.",
        cardLogo: "Brand identity, vector graphics, and professional logo design services.",
        cardDomain: "Domain management, DNS routing, and secure web presence configuration.",
        cardAI: "Smart assistant for text generation, video scripts, analysis, and coding.",
        footer: "All rights reserved.",
        signedOut: "You have signed out.",
        logoutError: "Could not sign out.",
        welcome: "Hello! I am Xsus AI. Ask me for a video script, creative text, or technical help!",
        placeholder: "Ask Xsus AI anything...",
        send: "Send",
        clear: "Clear chat"
    },

    fr: {
        heroBadge: "Plateforme officielle d’intelligence hybride",
        heroTitle: 'Les outils numériques les plus puissants dans un <span class="gradient-text">Studio unique</span>',
        heroBefore: "Les outils numériques les plus puissants réunis dans un",
        heroHighlight: "Studio unique",
        heroSub: "Découvrez nos outils numériques indépendants, conçus pour la performance, la créativité et la productivité.",
        subtitle: "Découvrez nos outils numériques indépendants, conçus pour la performance, la créativité et la productivité.",
        navAi: "Xsus AI",
        navApp: "Xsus App",
        navWeb: "Xsus Web",
        navGame: "Xsus Game",
        navLogo: "Xsus Logo",
        navDomain: "Xsus Domain",
        login: "Connexion",
        signup: "Inscription",
        logout: "Déconnexion",
        cardAi: "Assistant intelligent pour la génération de texte, les scripts vidéo, l’analyse et le code.",
        cardApp: "Création d’applications mobiles et web, aperçu en direct et personnalisation des thèmes.",
        cardWeb: "Conception web moderne, architectures multi-fichiers et solutions d’hébergement.",
        cardGame: "Jeux interactifs sur navigateur et moteurs physiques.",
        cardLogo: "Identité de marque, graphismes vectoriels et conception professionnelle de logos.",
        cardDomain: "Gestion de domaines, routage DNS et configuration sécurisée de présence web.",
        cardAI: "Assistant intelligent pour la génération de texte, les scripts vidéo, l’analyse et le code.",
        footer: "Tous droits réservés.",
        signedOut: "Vous êtes déconnecté.",
        logoutError: "Impossible de vous déconnecter.",
        welcome: "Bonjour ! Je suis Xsus AI. Demandez-moi un script vidéo, un texte créatif ou une aide technique !",
        placeholder: "Posez votre question à Xsus AI...",
        send: "Envoyer",
        clear: "Effacer la discussion"
    },

    sq: {
        heroBadge: "Platforma zyrtare e inteligjencës hibride",
        heroTitle: 'Veglat më të fuqishme digjitale në një <span class="gradient-text">Studio të vetme</span>',
        heroBefore: "Mjetet dixhitale më të fuqishme në një",
        heroHighlight: "Studio të vetme",
        heroSub: "Eksploro veglat tona digjitale, të krijuara për performancë, kreativitet dhe produktivitet.",
        subtitle: "Eksploro veglat tona digjitale, të krijuara për performancë, kreativitet dhe produktivitet.",
        navAi: "Xsus AI",
        navApp: "Xsus App",
        navWeb: "Xsus Web",
        navGame: "Xsus Game",
        navLogo: "Xsus Logo",
        navDomain: "Xsus Domain",
        login: "Hyr",
        signup: "Regjistrohu",
        logout: "Dil",
        cardAi: "Asistent inteligjent për krijimin e teksteve, skenarëve të videove, analizave dhe kodit.",
        cardApp: "Krijim aplikacionesh për celular dhe ueb, pamje paraprake dhe personalizim të temave.",
        cardWeb: "Dizajn modern uebi, struktura me shumë skedarë dhe zgjidhje për hostim.",
        cardGame: "Lojëra interaktive në shfletues dhe motorë fizikë.",
        cardLogo: "Identitet marke, grafika vektoriale dhe dizajn profesional logosh.",
        cardDomain: "Menaxhim domenesh, rutim DNS dhe konfigurim i sigurt i pranisë në ueb.",
        cardAI: "Asistent inteligjent për krijimin e teksteve, skenarëve të videove, analizave dhe kodit.",
        footer: "Të gjitha të drejtat e rezervuara.",
        signedOut: "Dole nga llogaria.",
        logoutError: "Dalja nga llogaria dështoi.",
        welcome: "Përshëndetje! Unë jam Xsus AI. Më kërko një skenar videoje, tekst krijues ose ndihmë teknike!",
        placeholder: "Pyet Xsus AI për çfarëdo që dëshiron...",
        send: "Dërgo",
        clear: "Pastro bisedën"
    }
};

let currentLang = localStorage.getItem("xsus_language") || "en";

if (!translations[currentLang]) {
    currentLang = "en";
}

function setLanguage(lang) {
    if (!translations[lang]) return;

    currentLang = lang;
    localStorage.setItem("xsus_language", lang);
    document.documentElement.lang = lang;

    const t = translations[lang];

    // Butonat e gjuhëve: EN, FR, SQ.
    ["en", "fr", "sq"].forEach(code => {
        const button = document.getElementById(`lang-${code}`);
        if (!button) return;

        const selected = code === lang;

        button.className = selected
            ? "px-2.5 py-1 rounded-md transition-all bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
            : "px-2.5 py-1 rounded-md transition-all text-slate-400 hover:text-white";

        button.setAttribute("aria-pressed", String(selected));
    });

    const setText = (selector, value) => {
        const element = document.querySelector(selector);
        if (element && value !== undefined) {
            element.textContent = value;
        }
    };

    const setHTML = (selector, value) => {
        const element = document.querySelector(selector);
        if (element && value !== undefined) {
            element.innerHTML = value;
        }
    };

    // Titulli dhe përshkrimi kryesor.
    setText("#hero-badge", t.heroBadge);

    const oldHeroTitle = document.getElementById("hero-title");

    if (oldHeroTitle) {
        setHTML("#hero-title", t.heroTitle);
    } else {
        setText('[data-i18n="heroBefore"]', t.heroBefore);
        setText('[data-i18n="heroHighlight"]', t.heroHighlight);
    }

    setText("#hero-subtitle", t.heroSub);

    // Navigimi.
    const navLinks = document.querySelectorAll("header nav a");
    const navKeys = [
        "navAi",
        "navApp",
        "navWeb",
        "navGame",
        "navLogo",
        "navDomain"
    ];

    navLinks.forEach((link, index) => {
        const key = navKeys[index];
        if (key && t[key]) {
            link.textContent = t[key];
        }
    });

    // Llogaria.
    setText("#loginLink", t.login);
    setText("#signupLink", t.signup);
    setText("#logoutButton", t.logout);

    // Përshkrimet e kartave.
    const cardKeys = [
        "cardAi",
        "cardApp",
        "cardWeb",
        "cardGame",
        "cardLogo",
        "cardDomain"
    ];

    document.querySelectorAll("main section.grid > a").forEach((card, index) => {
        const description = card.querySelector("p");
        const key = cardKeys[index];

        if (description && key && t[key]) {
            description.textContent = t[key];
        }
    });

    // Footer.
    const footer = document.querySelector("footer");

    if (footer) {
        const translatedFooter =
            lang === "en"
                ? "© 2026 XSUS Studio. All rights reserved."
                : lang === "fr"
                    ? "© 2026 XSUS Studio. Tous droits réservés."
                    : "© 2026 XSUS Studio. Të gjitha të drejtat e rezervuara.";

        footer.textContent = translatedFooter;
    }

    // Ndërfaqja e bisedës.
    setText("#welcome-msg", t.welcome);
    setText("#txt-send", t.send);
    setText("#txt-clear", t.clear);

    const input = document.getElementById("userInput");
    if (input) {
        input.placeholder = t.placeholder;
    }

    window.dispatchEvent(new CustomEvent("xsus:languageChanged", {
        detail: { language: lang }
    }));
}

function setAppTheme(theme) {
    const screen = document.getElementById("phoneScreen");
    if (!screen) return;

    const colors = {
        cyan: "border-cyan-500/50 shadow-cyan-500/20",
        purple: "border-purple-500/50 shadow-purple-500/20",
        emerald: "border-emerald-500/50 shadow-emerald-500/20",
        gold: "border-amber-500/50 shadow-amber-500/20"
    };

    if (!colors[theme]) return;

    screen.className =
        `flex-1 bg-slate-900 rounded-[28px] p-4 flex flex-col justify-between border ${colors[theme]} shadow-lg`;
}

function updateMockup() {
    ["ai", "scripts", "logo", "games"].forEach(name => {
        const checkbox = document.getElementById(`chk-${name}`);
        const item = document.getElementById(`m-${name}`);

        if (checkbox && item) {
            item.style.display = checkbox.checked ? "block" : "none";
        }
    });
}

function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({
        behavior: "smooth"
    });
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function clearChat() {
    const stream = document.getElementById("chatStream");
    if (!stream) return;

    stream.innerHTML = `
        <div class="flex gap-3 max-w-3xl">
            <div class="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <i data-lucide="bot" class="w-4 h-4 text-cyan-400"></i>
            </div>
            <div class="glass-panel p-4 rounded-2xl rounded-tl-none border-slate-800 text-sm text-slate-200">
                <p id="welcome-msg">${escapeHtml(translations[currentLang].welcome)}</p>
            </div>
        </div>
    `;

    window.lucide?.createIcons();
}

async function handleChatSubmit(event) {
    event?.preventDefault();

    const input = document.getElementById("userInput");
    const stream = document.getElementById("chatStream");

    if (!input || !stream) return;

    const userText = input.value.trim();
    if (!userText) return;

    const userBubble = document.createElement("div");
    userBubble.className = "flex gap-3 max-w-3xl ml-auto justify-end";

    userBubble.innerHTML = `
        <div class="glass-panel p-4 rounded-2xl rounded-tr-none border-cyan-500/30 bg-cyan-950/30 text-sm text-cyan-100">
            <p class="whitespace-pre-wrap">${escapeHtml(userText)}</p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0 font-bold text-slate-950 text-xs">YOU</div>
    `;

    stream.appendChild(userBubble);
    input.value = "";
    stream.scrollTop = stream.scrollHeight;

    const lower = userText.toLowerCase();

    const albanianKeywords = [
        "studentët", "studentet", "punojnë", "punojne",
        "libra", "shtëpi", "shtepi", "më jep", "me jep",
        "ngjyr", "fjalëkalim", "fjalekalim", "çfarë",
        "cfare", "për", "per", "dua", "si bëhet", "si behet"
    ];

    const isAlbanian =
        albanianKeywords.some(word => lower.includes(word)) ||
        currentLang === "sq";

    const targetLang = isAlbanian ? "sq" : currentLang;

    try {
        const localResponse = await smartRouter(userText, targetLang);

        if (localResponse) {
            appendAiMessage(
                typeof localResponse === "string"
                    ? localResponse
                    : localResponse.text || localResponse.answer || JSON.stringify(localResponse)
            );
            return;
        }
    } catch (error) {
        console.error("Local router error:", error);
    }

    appendAiMessage(generateSmartAiResponse(userText, targetLang));
}

function generateSmartAiResponse(userPrompt, activeLang = currentLang) {
    const prompt = userPrompt.toLowerCase();

    if (
        activeLang === "sq" ||
        prompt.includes("çfarë") ||
        prompt.includes("cfare") ||
        prompt.includes("më jep") ||
        prompt.includes("me jep")
    ) {
        if (
            prompt.includes("skenar") ||
            prompt.includes("video") ||
            prompt.includes("script")
        ) {
            return `🎬 Skenar profesional videoje

📌 Titulli: Drita e Besimit dhe Shpresës

🎥 Skena 1 (00:00 - 00:04):
Pamja: Male gjatë lindjes së diellit.
Zëri: "Edhe pas stuhisë, drita rikthehet."

🎥 Skena 2 (00:04 - 00:10):
Pamja: Drita e mëngjesit përhapet në natyrë.
Zëri: "Pas çdo vështirësie vjen lehtësimi."

💬 Thirrje për veprim: Ruaje dhe shpërndaje këtë video! ✨`;
        }

        return `E kuptova kërkesën tuaj: "${userPrompt}".\n\nXsus AI është gati t'ju ndihmojë. Më tregoni pak më shumë për atë që dëshironi të realizoni.`;
    }

    if (activeLang === "fr") {
        return `J’ai bien reçu votre demande : "${userPrompt}".\n\nXsus AI est prêt à vous aider. Pouvez-vous préciser ce que vous souhaitez réaliser ?`;
    }

    return `I received your request: "${userPrompt}".\n\nXsus AI is ready to help. Tell me a little more about what you want to achieve.`;
}

function appendAiMessage(message) {
    const stream = document.getElementById("chatStream");
    if (!stream) return;

    const bubble = document.createElement("div");
    bubble.className = "flex gap-3 max-w-3xl";

    const formatted = escapeHtml(message)
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300 font-semibold">$1</strong>')
        .replace(/\n/g, "<br>");

    bubble.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <i data-lucide="bot" class="w-4 h-4 text-cyan-400"></i>
        </div>
        <div class="glass-panel p-4 rounded-2xl rounded-tl-none border-slate-800 text-sm text-slate-200 leading-relaxed">
            <p>${formatted}</p>
        </div>
    `;

    stream.appendChild(bubble);
    window.lucide?.createIcons();
    stream.scrollTop = stream.scrollHeight;
}

document.addEventListener("DOMContentLoaded", () => {
    const chatForm =
        document.getElementById("chatForm") ||
        document.getElementById("userInput")?.closest("form");

    if (chatForm) {
        chatForm.addEventListener("submit", handleChatSubmit);
    }

    const input = document.getElementById("userInput");

    if (input) {
        input.addEventListener("keydown", event => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleChatSubmit(event);
            }
        });
    }

    setLanguage(currentLang);
    window.lucide?.createIcons();
});

// Funksionet e përdorura nga HTML-ja.
window.setLanguage = setLanguage;
window.setAppTheme = setAppTheme;
window.updateMockup = updateMockup;
window.scrollToSection = scrollToSection;
window.clearChat = clearChat;
window.handleChatSubmit = handleChatSubmit;
