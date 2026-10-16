import { smartRouter } from './services/router.js';

const translations = {
    en: {
        navAi: "Xsus AI",
        navEcosystem: "Ecosystem",
        navApps: "Xsus App",
        heroBadge: "Official Hybrid Intelligence Platform",
        heroTitle: 'Most powerful digital tools in a <span class="gradient-text">Single Studio</span>',
        heroSub: "Integrated platform combining artificial intelligence, app development, web, games, and graphic design.",
        btnExplore: "Try Xsus AI",
        btnTools: "View All Tools",
        aiDesc: "Smart hybrid assistant for questions, video scripts, content creation, and code.",
        aiConsoleTitle: "Xsus AI Interactive Console",
        clearChat: "Clear chat",
        welcomeMsg: "Hello! I am Xsus AI. Ask me for a video script, creative text, or technical question!",
        placeholder: "Ask Xsus AI anything...",
        send: "Send",
        appStudioDesc: "Design, customize, and preview your hybrid ecosystem mobile application in real-time.",
        appThemeTitle: "App Color Aesthetics",
        appToolsTitle: "Included Tools & Features",
        appLangTitle: "App Tri-Lingual Support",
        appLangSub: "Native dynamic switching between English, French, and Albanian (EN | FR | SQ) built directly into the mobile binary.",
        toolsTitle: "Xsus Studio Ecosystem",
        toolsSub: "All our integrated tools in one single platform.",
        cardAi: "Smart assistant for text generation, video scripts, analysis, and coding.",
        cardApp: "High performance mobile and web applications for daily use.",
        cardWeb: "Modern web design, development, and hosting architectures.",
        cardGame: "Interactive gaming experiences and browser games built on WebGL.",
        cardLogo: "Brand identity, vector graphics, and logo design services.",
        cardDomain: "Domain management, DNS routing, and web presence configuration.",
        appTitle: "Our apps on Play Store or App Store",
        appSub: "Download our official mobile applications for the best experience."
    },
    fr: {
        navAi: "Xsus AI",
        navEcosystem: "Écosystème",
        navApps: "Xsus App",
        heroBadge: "Plateforme d'intelligence hybride officielle",
        heroTitle: 'Les outils numériques les plus puissants dans un <span class="gradient-text">Seul Studio</span>',
        heroSub: "Plateforme intégrée combinant intelligence artificielle, développement d'applications, web, jeux et design.",
        btnExplore: "Essayer Xsus AI",
        btnTools: "Voir tous les outils",
        aiDesc: "Assistant hybride intelligent pour questions, scripts vidéo, création de contenu et code.",
        aiConsoleTitle: "Console Interactive Xsus AI",
        clearChat: "Effacer la discussion",
        welcomeMsg: "Bonjour! Je suis Xsus AI. Demandez-moi un script vidéo, du texte ou une question!",
        placeholder: "Posez votre question à Xsus AI...",
        send: "Envoyer",
        appStudioDesc: "Personnalisez et prévisualisez votre application mobile en temps réel.",
        appThemeTitle: "Esthétique des couleurs",
        appToolsTitle: "Outils & Fonctionnalités inclus",
        appLangTitle: "Support Trilingue Intégré",
        appLangSub: "Bascule dynamique entre l'anglais, le français et l'albanais intégrée directement.",
        toolsTitle: "Écosystème Xsus Studio",
        toolsSub: "Tous nos outils intégrés sur une seule plateforme.",
        cardAi: "Assistant intelligent pour la génération de texte, scripts vidéo et code.",
        cardApp: "Applications mobiles et web haute performance à usage quotidien.",
        cardWeb: "Design web moderne, développement et architectures d'hébergement.",
        cardGame: "Expériences de jeu interactives et jeux par navigateur basés sur WebGL.",
        cardLogo: "Identité de marque, graphismes vectoriels et création de logos.",
        cardDomain: "Gestion de domaines, routage DNS et configuration web.",
        appTitle: "Nos applications sur Play Store ou App Store",
        appSub: "Téléchargez nos applications mobiles officielles pour une meilleure expérience."
    },
    sq: {
        navAi: "Xsus AI",
        navEcosystem: "Ekosistemi",
        navApps: "Xsus App",
        heroBadge: "Platforma Zyrtare e Inteligjencës Hibride",
        heroTitle: 'Veglat më të fuqishme digjitale në një <span class="gradient-text">Studio të Vetme</span>',
        heroSub: "Platformë e integruar që ndërthur inteligjencën artificiale, zhvillimin e aplikacioneve, uebit, lojërave dhe dizajnit grafik.",
        btnExplore: "Provo Xsus AI",
        btnTools: "Shiko të Gjitha Veglat",
        aiDesc: "Asistent hibrid inteligjent për pyetje, skenarë videosh, krijim përmbajtjeje dhe kodim.",
        aiConsoleTitle: "Xsus AI Interactive Console",
        clearChat: "Pastro bisedën",
        welcomeMsg: "Përshëndetje! Unë jam Xsus AI. Më kërkoni një skenar videoje, një tekst apo pyetje profesionale!",
        placeholder: "Pyet Xsus AI për çfarëdo që dëshiron...",
        send: "Dërgo",
        appStudioDesc: "Dizajnoni, personalizoni dhe shikoni pamjen e aplikacionit tuaj celular në kohë reale.",
        appThemeTitle: "Dizajni & Ngjyrat e App-it",
        appToolsTitle: "Veglat e Përfshira në App",
        appLangTitle: "Mbështetje për Tri Gjuhët",
        appLangSub: "Kalim dinamik midis Anglishtes, Frëngjishtes dhe Shqipes direkt brenda aplikacionit.",
        toolsTitle: "Ekosistemi Xsus Studio",
        toolsSub: "Të gjitha mjetet tona të integruara në një platformë të vetme.",
        cardAi: "Asistent inteligjent për gjenerim teksti, skenarë videosh, analiza dhe kodim.",
        cardApp: "Aplikacione celulare dhe ueb me performancë të lartë për përdorim të përditshëm.",
        cardWeb: "Zgjidhje moderne për dizajn uebi, zhvillim dhe arkitektura gostitjeje (hosting).",
        cardGame: "Përvoja lojërash interaktive dhe lojëra direkte në shfletues të ndërtuara mbi WebGL.",
        cardLogo: "Identitet brandi, grafika vektoriale dhe konceptim profesional logosh.",
        cardDomain: "Menaxhim domenesht, rutim DNS dhe konfigurim i pranisë në ueb.",
        appTitle: "App tona në Play Store ose App Store",
        appSub: "Shkarkoni aplikacionet tona zyrtare për përvojën më të mirë në celular."
    }
};

let currentLang = 'en';

function setLanguage(lang) {
    currentLang = lang;
    ['en', 'fr', 'sq'].forEach(l => {
        const btn = document.getElementById(`lang-${l}`);
        if (btn) {
            if (l === lang) {
                btn.className = "px-2.5 py-1 rounded-md transition-all bg-cyan-500/20 text-cyan-400 border border-cyan-500/40";
            } else {
                btn.className = "px-2.5 py-1 rounded-md transition-all text-slate-400 hover:text-white";
            }
        }
    });

    const t = translations[lang];

    if (document.getElementById('nav-ai-link')) document.getElementById('nav-ai-link').innerText = t.navAi;
    if (document.getElementById('nav-ecosystem-link')) document.getElementById('nav-ecosystem-link').innerText = t.navEcosystem;
    if (document.getElementById('nav-apps-link')) document.getElementById('nav-apps-link').innerText = t.navApps;
    
    if (document.getElementById('hero-badge')) document.getElementById('hero-badge').innerText = t.heroBadge;
    if (document.getElementById('hero-title')) document.getElementById('hero-title').innerHTML = t.heroTitle;
    if (document.getElementById('hero-subtitle')) document.getElementById('hero-subtitle').innerText = t.heroSub;
    if (document.getElementById('btn-explore')) document.getElementById('btn-explore').innerText = t.btnExplore;
    if (document.getElementById('btn-tools')) document.getElementById('btn-tools').innerText = t.btnTools;
    
    if (document.getElementById('ai-desc')) document.getElementById('ai-desc').innerText = t.aiDesc;
    if (document.getElementById('ai-console-title')) document.getElementById('ai-console-title').innerText = t.aiConsoleTitle;
    if (document.getElementById('txt-clear')) document.getElementById('txt-clear').innerText = t.clearChat;
    if (document.getElementById('welcome-msg')) document.getElementById('welcome-msg').innerText = t.welcomeMsg;
    if (document.getElementById('userInput')) document.getElementById('userInput').placeholder = t.placeholder;
    if (document.getElementById('txt-send')) document.getElementById('txt-send').innerText = t.send;
    
    if (document.getElementById('app-studio-desc')) document.getElementById('app-studio-desc').innerText = t.appStudioDesc;
    if (document.getElementById('app-theme-title')) document.getElementById('app-theme-title').innerText = t.appThemeTitle;
    if (document.getElementById('app-tools-title')) document.getElementById('app-tools-title').innerText = t.appToolsTitle;
    if (document.getElementById('app-lang-title')) document.getElementById('app-lang-title').innerText = t.appLangTitle;
    if (document.getElementById('app-lang-sub')) document.getElementById('app-lang-sub').innerText = t.appLangSub;

    if (document.getElementById('tools-title')) document.getElementById('tools-title').innerText = t.toolsTitle;
    if (document.getElementById('tools-sub')) document.getElementById('tools-sub').innerText = t.toolsSub;
    if (document.getElementById('card-ai-desc')) document.getElementById('card-ai-desc').innerText = t.cardAi;
    if (document.getElementById('card-app-desc')) document.getElementById('card-app-desc').innerText = t.cardApp;
    if (document.getElementById('card-web-desc')) document.getElementById('card-web-desc').innerText = t.cardWeb;
    if (document.getElementById('card-game-desc')) document.getElementById('card-game-desc').innerText = t.cardGame;
    if (document.getElementById('card-logo-desc')) document.getElementById('card-logo-desc').innerText = t.cardLogo;
    if (document.getElementById('card-domain-desc')) document.getElementById('card-domain-desc').innerText = t.cardDomain;
    
    if (document.getElementById('app-section-title')) document.getElementById('app-section-title').innerText = t.appTitle;
    if (document.getElementById('app-section-subtitle')) document.getElementById('app-section-subtitle').innerText = t.appSub;
}

function setAppTheme(theme) {
    const screen = document.getElementById('phoneScreen');
    if (!screen) return;
    
    if (theme === 'cyan') {
        screen.className = "flex-1 bg-slate-900 rounded-[28px] p-4 flex flex-col justify-between border border-cyan-500/50 shadow-lg shadow-cyan-500/20";
    } else if (theme === 'purple') {
        screen.className = "flex-1 bg-slate-900 rounded-[28px] p-4 flex flex-col justify-between border border-purple-500/50 shadow-lg shadow-purple-500/20";
    } else if (theme === 'emerald') {
        screen.className = "flex-1 bg-slate-900 rounded-[28px] p-4 flex flex-col justify-between border border-emerald-500/50 shadow-lg shadow-emerald-500/20";
    } else if (theme === 'gold') {
        screen.className = "flex-1 bg-slate-900 rounded-[28px] p-4 flex flex-col justify-between border border-amber-500/50 shadow-lg shadow-amber-500/20";
    }
}

function updateMockup() {
    const ai = document.getElementById('chk-ai')?.checked;
    const scripts = document.getElementById('chk-scripts')?.checked;
    const logo = document.getElementById('chk-logo')?.checked;
    const games = document.getElementById('chk-games')?.checked;

    document.getElementById('m-ai').style.display = ai ? 'block' : 'none';
    document.getElementById('m-scripts').style.display = scripts ? 'block' : 'none';
    document.getElementById('m-logo').style.display = logo ? 'block' : 'none';
    document.getElementById('m-games').style.display = games ? 'block' : 'none';
}

function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function clearChat() {
    const stream = document.getElementById('chatStream');
    if (stream) {
        stream.innerHTML = `
            <div class="flex gap-3 max-w-3xl">
                <div class="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                    <i data-lucide="bot" class="w-4 h-4 text-cyan-400"></i>
                </div>
                <div class="glass-panel p-4 rounded-2xl rounded-tl-none border-slate-800 text-sm text-slate-200">
                    <p id="welcome-msg">${translations[currentLang].welcomeMsg}</p>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

// Lidhja kryesore asinkrone me Router-in lokal (duke përcjellë currentLang)
async function handleChatSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('userInput');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    const stream = document.getElementById('chatStream');

    const userBubble = document.createElement('div');
    userBubble.className = "flex gap-3 max-w-3xl ml-auto justify-end";
    userBubble.innerHTML = `
        <div class="glass-panel p-4 rounded-2xl rounded-tr-none border-cyan-500/30 bg-cyan-950/30 text-sm text-cyan-100">
            <p class="whitespace-pre-wrap">${escapeHtml(text)}</p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0 font-bold text-slate-950 text-xs">
            YOU
        </div>
    `;
    stream.appendChild(userBubble);
    input.value = '';
    stream.scrollTop = stream.scrollHeight;

    // 1. Kontrollojmë fillimisht me Router-in lokal duke i kaluar activeLang (currentLang)
    try {
        const localResponse = await smartRouter(text, currentLang);
        if (localResponse) {
            appendAiMessage(localResponse);
            return;
        }
    } catch (err) {
        console.error("Local router error:", err);
    }

    // 2. Nëse nuk kapet lokalisht, kërkesa bie te AI-ja e jashtme
    setTimeout(() => {
        const responseText = generateSmartAiResponse(text);
        appendAiMessage(responseText);
    }, 400);
}

function generateSmartAiResponse(userPrompt) {
    const prompt = userPrompt.toLowerCase();

    // Kontrollojmë nëse gjuha aktuale ose pyetja është në shqip
    if (currentLang === 'sq' || prompt.includes("më jep") || prompt.includes("çfarë") || prompt.includes("si")) {
        if (prompt.includes("skenar") || prompt.includes("video") || prompt.includes("script")) {
            return `🎬 **Skenar Profesional Videoje (30-60 Sekonda)**\n\n` +
                   `📌 **Titulli:** Drita e Besimit dhe Shpresës\n\n` +
                   `🎥 **Skena 1 (00:00 - 00:04):**\n` +
                   `*Pamja:* Pamje kinematografike e maleve gjatë lindjes së diellit.\n` +
                   `*Zëri në sfond:* "Në çdo stuhi që kalon në jetë, kujto se stuhitë nuk zgjasin përgjithmonë..."\n\n` +
                   `🎥 **Skena 2 (00:04 - 00:10):**\n` +
                   `*Pamja:* Drita e qetë e mëngjesit që përhapet në natyrë.\n` +
                   `*Zëri në sfond:* "Pas çdo vështirësie vjen lehtësimi."\n\n` +
                   `💬 **Thirrje për veprim:** "Ruaje këtë video dhe shpërndaje me dikë sot! ✨"`;
        }
        return `Mora kërkesën tuaj: **"${userPrompt}"**.\n\nSi modul inteligjent i **Xsus Studio**, jam gati t'ju ndihmoj ta zhvillojmë këtë ide më tej!`;
    }

    if (prompt.includes("skenar") || prompt.includes("video") || prompt.includes("script")) {
        return `🎬 **Professional Video Script (30-60 Seconds)**\n\n` +
               `📌 **Title:** The Light of Trust and Hope\n\n` +
               `🎥 **Scene 1 (00:00 - 00:04):**\n` +
               `*Visual:* Cinematic view of mountains during sunrise.\n` +
               `*Voiceover:* "In every storm you face in life, remember that storms do not last forever..."\n\n` +
               `🎥 **Scene 2 (00:04 - 00:10):**\n` +
               `*Visual:* Peaceful morning light flowing through nature.\n` +
               `*Voiceover:* "With every hardship comes ease."\n\n` +
               `💬 **Call To Action:** "Save this video and share it with someone today! ✨"`;
    }

    return `I received your prompt: **"${userPrompt}"**.\n\nAs an intelligent module of **Xsus Studio**, I am ready to help you develop this idea further!`;
}

function appendAiMessage(msg) {
    const stream = document.getElementById('chatStream');
    const aiBubble = document.createElement('div');
    aiBubble.className = "flex gap-3 max-w-3xl";
    
    let formatted = escapeHtml(msg)
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300 font-semibold">$1</strong>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="mt-2 rounded-lg max-w-[220px] border border-cyan-500/30 shadow-md" />')
        .replace(/\n/g, '<br>');

    aiBubble.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <i data-lucide="bot" class="w-4 h-4 text-cyan-400"></i>
        </div>
        <div class="glass-panel p-4 rounded-2xl rounded-tl-none border-slate-800 text-sm text-slate-200 leading-relaxed space-y-2">
            <p>${formatted}</p>
        </div>
    `;
    stream.appendChild(aiBubble);
    if (window.lucide) lucide.createIcons();
    stream.scrollTop = stream.scrollHeight;
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Particle Canvas Background
const canvas = document.getElementById('particleCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const particles = Array.from({ length: 45 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2
    }));

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.fillStyle = `rgba(0, 242, 254, ${p.opacity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();
}

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.querySelector('form');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('txt-send')?.parentElement;

    if (chatForm) {
        chatForm.onsubmit = handleChatSubmit;
    }

    if (sendBtn) {
        sendBtn.onclick = handleChatSubmit;
    }

    if (userInput) {
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit(e);
            }
        });
    }
});

setLanguage('en');

if (window.lucide) lucide.createIcons();
