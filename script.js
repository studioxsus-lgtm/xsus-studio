const translations = {
    en: {
        heroBadge: "Official Hybrid Intelligence Platform",
        heroSub: "Integrated platform combining artificial intelligence, app development, web, games, and graphic design.",
        btnExplore: "Try Xsus AI",
        btnTools: "View All Tools",
        aiDesc: "Smart hybrid assistant for questions, video scripts, content creation, and code.",
        clearChat: "Clear chat",
        welcomeMsg: "Hello! I am Xsus AI. Ask me for a video script, creative text, or technical question!",
        placeholder: "Ask Xsus AI anything...",
        send: "Send",
        toolsSub: "All our integrated tools in one single platform.",
        cardAi: "Smart assistant for text generation, video scripts, analysis, and coding.",
        cardApp: "High performance mobile and web applications for daily use.",
        cardWeb: "Modern web design, development, and hosting architectures.",
        cardGame: "Interactive gaming experiences and browser games built on WebGL.",
        cardLogo: "Brand identity, vector graphics, and logo design services.",
        cardDomain: "Domain management, DNS routing, and web presence configuration.",
        appTitle: "App tona në Play Store ose App Store",
        appSub: "Download our official mobile applications for the best experience."
    },
    fr: {
        heroBadge: "Plateforme d'intelligence hybride officielle",
        heroSub: "Plateforme intégrée combinant intelligence artificielle, développement d'applications, web, jeux et design.",
        btnExplore: "Essayer Xsus AI",
        btnTools: "Voir tous les outils",
        aiDesc: "Assistant hybride intelligent pour questions, scripts vidéo, création de contenu et code.",
        clearChat: "Effacer la discussion",
        welcomeMsg: "Bonjour! Je suis Xsus AI. Demandez-moi un script vidéo, du texte ou une question!",
        placeholder: "Posez votre question à Xsus AI...",
        send: "Envoyer",
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
        heroBadge: "Platforma Zyrtare e Inteligjencës Hibride",
        heroSub: "Platformë e integruar që ndërthur inteligjencën artificiale, zhvillimin e aplikacioneve, uebit, lojërave dhe dizajnit grafik.",
        btnExplore: "Provo Xsus AI",
        btnTools: "Shiko të Gjitha Veglat",
        aiDesc: "Asistent hibrid inteligjent për pyetje, skenarë videosh, krijim përmbajtjeje dhe kodim.",
        clearChat: "Pastro bisedën",
        welcomeMsg: "Përshëndetje! Unë jam Xsus AI. Më kërkoni një skenar videoje, një tekst apo pyetje profesionale!",
        placeholder: "Pyet Xsus AI për çfarëdo që dëshiron...",
        send: "Dërgo",
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

let currentLang = 'sq';

function setLanguage(lang) {
    currentLang = lang;
    ['en', 'fr', 'sq'].forEach(l => {
        const btn = document.getElementById(`lang-${l}`);
        if (l === lang) {
            btn.className = "px-2.5 py-1 rounded-md transition-all bg-cyan-500/20 text-cyan-400 border border-cyan-500/40";
        } else {
            btn.className = "px-2.5 py-1 rounded-md transition-all text-slate-400 hover:text-white";
        }
    });

    const t = translations[lang];
    document.getElementById('hero-badge').innerText = t.heroBadge;
    document.getElementById('hero-subtitle').innerText = t.heroSub;
    document.getElementById('btn-explore').innerText = t.btnExplore;
    document.getElementById('btn-tools').innerText = t.btnTools;
    document.getElementById('ai-desc').innerText = t.aiDesc;
    document.getElementById('txt-clear').innerText = t.clearChat;
    document.getElementById('userInput').placeholder = t.placeholder;
    document.getElementById('txt-send').innerText = t.send;
    document.getElementById('tools-sub').innerText = t.toolsSub;
    document.getElementById('card-ai-desc').innerText = t.cardAi;
    document.getElementById('card-app-desc').innerText = t.cardApp;
    document.getElementById('card-web-desc').innerText = t.cardWeb;
    document.getElementById('card-game-desc').innerText = t.cardGame;
    document.getElementById('card-logo-desc').innerText = t.cardLogo;
    document.getElementById('card-domain-desc').innerText = t.cardDomain;
    document.getElementById('app-section-title').innerText = t.appTitle;
    document.getElementById('app-section-subtitle').innerText = t.appSub;
}

function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function clearChat() {
    const stream = document.getElementById('chatStream');
    stream.innerHTML = `
        <div class="flex gap-3 max-w-3xl">
            <div class="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <i data-lucide="bot" class="w-4 h-4 text-cyan-400"></i>
            </div>
            <div class="glass-panel p-4 rounded-2xl rounded-tl-none border-slate-800 text-sm text-slate-200">
                <p>${translations[currentLang].welcomeMsg}</p>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('userInput');
    const text = input.value.trim();
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

    setTimeout(() => {
        const responseText = generateSmartAiResponse(text);
        appendAiMessage(responseText);
    }, 400);
}

function generateSmartAiResponse(userPrompt) {
    const prompt = userPrompt.toLowerCase();

    if (prompt.includes("skenar") || prompt.includes("video") || prompt.includes("islame") || prompt.includes("script")) {
        return `🎬 **Skenar Profesional për Video Islame (30-60 Sekonda)**\n\n` +
               `📌 **Titulli:** Drita e Sabrit dhe Besimit\n\n` +
               `🎥 **Pamja 1 (00:00 - 00:04):**\n` +
               `*Vizuale:* Pamje nga mali gjatë lindjes së diellit, me rreze të ngrohta që përhapen ngadalë.\n` +
               `*Zëri (Voiceover):* "Në çdo stuhi që kalon në jetë, kujto se stuhitë nuk zgjasin përgjithmonë..."\n\n` +
               `🎥 **Pamja 2 (00:04 - 00:10):**\n` +
               `*Vizuale:* Një person duke u lutur me qetësi në dritën e mëngjesit.\n` +
               `*Zëri (Voiceover):* "Zoti nuk ngarkon asnjë shpirt më shumë se sa ai mund të mbajë. Çdo sprovë ka një lehtësim mbrapa."\n\n` +
               `🎥 **Pamja 3 (00:10 - 00:15):**\n` +
               `*Vizuale:* Ujë i pastër që rrjedh ngadalë midis gurëve në natyrë.\n` +
               `*Zëri (Voiceover):* "Mbaje shpresën të gjallë dhe kërko qetësinë në lutje."\n\n` +
               `💬 **Call To Action:** "Ruaje këtë video dhe shpërndaje me miqtë e tu! ✨"`;
    }

    if (prompt.includes("shqip") || prompt.includes("përshëndetje")) {
        return "Përshëndetje! Unë jam **Xsus AI**. Flas shqip rrjedhshëm dhe jam i përgatitur t'ju ndihmoj me skenarë videosh, tekst letrar, kodim apo koncepte dizajni!";
    }

    return `Mora kërkesën tuaj: **"${userPrompt}"**.\n\nSi modul inteligjent i **Xsus Studio**, jam i gatshëm t'ju ndihmoj ta zhvilloni këtë ide në një skenar të plotë, artikull apo kod kërkimor!`;
}

function appendAiMessage(msg) {
    const stream = document.getElementById('chatStream');
    const aiBubble = document.createElement('div');
    aiBubble.className = "flex gap-3 max-w-3xl";
    
    const formatted = escapeHtml(msg)
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300 font-semibold">$1</strong>')
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
    lucide.createIcons();
    stream.scrollTop = stream.scrollHeight;
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Particle Canvas Background
const canvas = document.getElementById('particleCanvas');
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

// Init Lucide Icons
lucide.createIcons();
