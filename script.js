import { smartRouter } from "./services/router.js";

/**

* XSUS Studio — Main Frontend Controller
* 
* Përgjegjësitë:
* - Përkthimi EN / FR / SQ.
* - Përputhshmëria me index.html dhe atributet data-i18n.
* - Navigimi dhe përditësimi i ndërfaqes.
* - Menaxhimi i bisedës me XSUS AI përmes smartRouter.
* - Përgjigjet rezervë kur router-i nuk kthen përgjigje.
* - Ruajtja e funksioneve publike të përdorura nga HTML-ja.
    */

const SUPPORTED_LANGUAGES = ["en", "fr", "sq"];

const translations = {
en: {
heroBadge: "Official Hybrid Intelligence Platform",
heroTitle:
'The most powerful digital tools in a <span class="gradient-text">Single Studio</span>',
heroBefore: "The most powerful digital tools in a",
heroHighlight: "Single Studio",
heroSub:
"Explore our independent digital tools, designed for performance, creativity and productivity.",
subtitle:
"Explore our independent digital tools, designed for performance, creativity and productivity.",

    navAI: "XSUS AI",
    navAi: "XSUS AI",
    navApp: "XSUS App",
    navWeb: "XSUS Web",
    navGame: "XSUS Game",
    navLogo: "XSUS Logo",
    navDomain: "XSUS Domain",

    login: "Login",
    signup: "Sign Up",
    logout: "Logout",

    cardAI:
        "Smart assistant for text generation, video scripts, analysis, and coding.",
    cardAi:
        "Smart assistant for text generation, video scripts, analysis, and coding.",
    cardApp:
        "Mobile and web application builder, live previews, and theme customization.",
    cardWeb:
        "Modern web design, multi-file architectures, and hosting solutions.",
    cardGame:
        "Interactive browser gaming experiences and physics engines.",
    cardLogo:
        "Brand identity, vector graphics, and professional logo design services.",
    cardDomain:
        "Domain management, DNS routing, and secure web presence configuration.",

    footer: "All rights reserved.",
    signedOut: "You have signed out.",
    logoutError: "Could not sign out.",

    welcome:
        "Hello! I am XSUS AI. Ask me for a video script, creative text, or technical help!",
    placeholder: "Ask XSUS AI anything...",
    send: "Send",
    clear: "Clear chat",

    thinking: "XSUS AI is thinking...",
    emptyResponse:
        "I couldn't generate a response. Please try again.",
    error:
        "Something went wrong while processing your request. Please try again.",
    you: "YOU",
    languageName: "English"
},

fr: {
    heroBadge: "Plateforme officielle d’intelligence hybride",
    heroTitle:
        'Les outils numériques les plus puissants dans un <span class="gradient-text">Studio unique</span>',
    heroBefore:
        "Les outils numériques les plus puissants réunis dans un",
    heroHighlight: "Studio unique",
    heroSub:
        "Découvrez nos outils numériques indépendants, conçus pour la performance, la créativité et la productivité.",
    subtitle:
        "Découvrez nos outils numériques indépendants, conçus pour la performance, la créativité et la productivité.",

    navAI: "XSUS AI",
    navAi: "XSUS AI",
    navApp: "XSUS App",
    navWeb: "XSUS Web",
    navGame: "XSUS Game",
    navLogo: "XSUS Logo",
    navDomain: "XSUS Domain",

    login: "Connexion",
    signup: "Inscription",
    logout: "Déconnexion",

    cardAI:
        "Assistant intelligent pour la génération de texte, les scripts vidéo, l’analyse et le code.",
    cardAi:
        "Assistant intelligent pour la génération de texte, les scripts vidéo, l’analyse et le code.",
    cardApp:
        "Création d’applications mobiles et web, aperçu en direct et personnalisation des thèmes.",
    cardWeb:
        "Conception web moderne, architectures multi-fichiers et solutions d’hébergement.",
    cardGame:
        "Jeux interactifs sur navigateur et moteurs physiques.",
    cardLogo:
        "Identité de marque, graphismes vectoriels et conception professionnelle de logos.",
    cardDomain:
        "Gestion de domaines, routage DNS et configuration sécurisée de présence web.",

    footer: "Tous droits réservés.",
    signedOut: "Vous êtes déconnecté.",
    logoutError: "Impossible de vous déconnecter.",

    welcome:
        "Bonjour ! Je suis XSUS AI. Demandez-moi un script vidéo, un texte créatif ou une aide technique !",
    placeholder: "Posez votre question à XSUS AI...",
    send: "Envoyer",
    clear: "Effacer la discussion",

    thinking: "XSUS AI réfléchit...",
    emptyResponse:
        "Je n’ai pas pu générer de réponse. Veuillez réessayer.",
    error:
        "Une erreur est survenue pendant le traitement de votre demande. Veuillez réessayer.",
    you: "VOUS",
    languageName: "Français"
},

sq: {
    heroBadge: "Platforma zyrtare e inteligjencës hibride",
    heroTitle:
        'Veglat më të fuqishme digjitale në një <span class="gradient-text">Studio të vetme</span>',
    heroBefore: "Mjetet dixhitale më të fuqishme në një",
    heroHighlight: "Studio të vetme",
    heroSub:
        "Eksploro veglat tona digjitale, të krijuara për performancë, kreativitet dhe produktivitet.",
    subtitle:
        "Eksploro veglat tona digjitale, të krijuara për performancë, kreativitet dhe produktivitet.",

    navAI: "XSUS AI",
    navAi: "XSUS AI",
    navApp: "XSUS App",
    navWeb: "XSUS Web",
    navGame: "XSUS Game",
    navLogo: "XSUS Logo",
    navDomain: "XSUS Domain",

    login: "Hyr",
    signup: "Regjistrohu",
    logout: "Dil",

    cardAI:
        "Asistent inteligjent për krijimin e teksteve, skenarëve të videove, analizave dhe kodit.",
    cardAi:
        "Asistent inteligjent për krijimin e teksteve, skenarëve të videove, analizave dhe kodit.",
    cardApp:
        "Krijim aplikacionesh për celular dhe ueb, pamje paraprake dhe personalizim të temave.",
    cardWeb:
        "Dizajn modern uebi, struktura me shumë skedarë dhe zgjidhje për hostim.",
    cardGame:
        "Lojëra interaktive në shfletues dhe motorë fizikë.",
    cardLogo:
        "Identitet marke, grafika vektoriale dhe dizajn profesional logosh.",
    cardDomain:
        "Menaxhim domenesh, rutim DNS dhe konfigurim i sigurt i pranisë në ueb.",

    footer: "Të gjitha të drejtat e rezervuara.",
    signedOut: "Dole nga llogaria.",
    logoutError: "Dalja nga llogaria dështoi.",

    welcome:
        "Përshëndetje! Unë jam XSUS AI. Më kërko një skenar videoje, tekst krijues ose ndihmë teknike!",
    placeholder: "Pyet XSUS AI për çfarëdo që dëshiron...",
    send: "Dërgo",
    clear: "Pastro bisedën",

    thinking: "XSUS AI po mendon...",
    emptyResponse:
        "Nuk arrita të krijoj një përgjigje. Provo përsëri.",
    error:
        "Ndodhi një gabim gjatë përpunimit të kërkesës. Provo përsëri.",
    you: "TI",
    languageName: "Shqip"
}

};

let currentLang = getInitialLanguage();
let chatIsProcessing = false;

/**

* Merr gjuhën e ruajtur pa lejuar që një problem me localStorage

* të pengojë ngarkimin e faqes.
  */
  function getInitialLanguage() {
  try {
  const savedLanguage = localStorage.getItem("xsus_language");
  
   return SUPPORTED_LANGUAGES.includes(savedLanguage)
     ? savedLanguage
     : "en";
  
  } catch (error) {
  console.warn("XSUS language preference unavailable:", error);
  return "en";
  }
  }

/**

* Merr përkthimin për gjuhën aktive.
  */
  function getTranslation(key, language = currentLang) {
  const languageDictionary = translations[language] || translations.en;
  
  return languageDictionary[key] ??
  translations.en[key] ??
  key;
  }

/**

* Përditëson tekstin duke ruajtur ikonat dhe elementet HTML

* që mund të jenë brenda lidhjeve të navigimit.
  */
  function translateElement(element, value) {
  if (!element || value === undefined || value === null) {
  return;
  }
  
  const textTarget = element.querySelector(
  "[data-i18n-text], [data-i18n-label]"
  );
  
  if (textTarget) {
  textTarget.textContent = value;
  return;
  }
  
  const icon = element.querySelector("[data-lucide]");
  
  if (icon) {
  const spans = element.querySelectorAll("span");
  
   if (spans.length > 0) {
     spans[spans.length - 1].textContent = value;
     return;
 }
  
  }
  
  element.textContent = value;
  }

/**

* Përkthen të gjithë elementet që përdorin data-i18n.

* 

* Shembuj:

* data-i18n="navAI"

* data-i18n-html="heroTitle"

* data-i18n-placeholder="placeholder"
  */
  function translateDataAttributes() {
  document.querySelectorAll("[data-i18n]").forEach(element => {
  const key = element.getAttribute("data-i18n");
  
   if (!key) return;

 translateElement(element, getTranslation(key));
  
  });
  
  document.querySelectorAll("[data-i18n-html]").forEach(element => {
  const key = element.getAttribute("data-i18n-html");
  
   if (!key) return;

 const value = getTranslation(key);

 // Lejohet HTML vetëm për përkthimet e kontrolluara
 // që janë deklaruar brenda këtij skedari.
 element.innerHTML = value;
  
  });
  
  document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
  const key = element.getAttribute("data-i18n-placeholder");
  
   if (key && "placeholder" in element) {
     element.placeholder = getTranslation(key);
 }
  
  });
  
  document.querySelectorAll("[data-i18n-title]").forEach(element => {
  const key = element.getAttribute("data-i18n-title");
  
   if (key) {
     element.setAttribute("title", getTranslation(key));
 }
  
  });
  
  document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
  const key = element.getAttribute("data-i18n-aria-label");
  
   if (key) {
     element.setAttribute("aria-label", getTranslation(key));
 }
  
  });
  }

/**

* Përditëson një element përmes ID-së.
  */
  function setTextById(id, value) {
  const element = document.getElementById(id);
  
  if (element && value !== undefined) {
  translateElement(element, value);
  }
  }

/**

* Përditëson butonat klasikë të gjuhëve,

* nëse ekzistojnë në ndonjë faqe të vjetër.
  */
  function updateLanguageButtons() {
  SUPPORTED_LANGUAGES.forEach(language => {
  const button = document.getElementById("lang-${language}");
  
   if (!button) return;

 const selected = language === currentLang;

 button.setAttribute("aria-pressed", String(selected));

 button.classList.toggle("bg-cyan-500/20", selected);
 button.classList.toggle("text-cyan-400", selected);
 button.classList.toggle("border", selected);
 button.classList.toggle("border-cyan-500/40", selected);

 button.classList.toggle("text-slate-400", !selected);
 button.classList.toggle("hover:text-white", !selected);
  
  });
  
  const selector = document.getElementById("languageSelect");
  
  if (selector && selector.value !== currentLang) {
  selector.value = currentLang;
  }
  }

/**

* Përkthen kartat e moduleve kur HTML-ja përdor strukturën

* tradicionale pa data-i18n në përshkrime.
  */
  function translateModuleCards() {
  const cards = [
  { selector: ".xsus-card-ai", key: "cardAI" },
  { selector: ".xsus-card-app", key: "cardApp" },
  { selector: ".xsus-card-web", key: "cardWeb" },
  { selector: ".xsus-card-game", key: "cardGame" },
  { selector: ".xsus-card-logo", key: "cardLogo" },
  { selector: ".xsus-card-domain", key: "cardDomain" }
  ];
  
  cards.forEach(({ selector, key }) => {
  const card = document.querySelector(selector);
  const description = card?.querySelector("p");
  
   if (description) {
     description.textContent = getTranslation(key);
 }
  
  });
  
  // Përputhshmëri me versionet e mëparshme të index.html.
  const legacyCards = document.querySelectorAll(
  "main section.grid > a"
  );
  
  const legacyKeys = [
  "cardAI",
  "cardApp",
  "cardWeb",
  "cardGame",
  "cardLogo",
  "cardDomain"
  ];
  
  legacyCards.forEach((card, index) => {
  // Nëse karta ka përkthim të drejtpërdrejtë,
  // mos e mbishkruaj me përkthimin sipas renditjes.
  if (card.hasAttribute("data-i18n")) return;
  
   const description = card.querySelector("p");
 const key = legacyKeys[index];

 if (description && key) {
     description.textContent = getTranslation(key);
 }
  
  });
  }

/**

* Përkthen footer-in pa hequr elementet e tjera,

* nëse ai përmban elemente HTML.
  */
  function translateFooter() {
  const footer = document.querySelector("footer");
  
  if (!footer) return;
  
  const copyright = footer.querySelector("[data-i18n='footer']");
  
  if (copyright) {
  copyright.textContent =
  "© ${new Date().getFullYear()} XSUS Studio. ${getTranslation("footer")}";
  return;
  }
  
  const copyrightElement = footer.querySelector(
  ".copyright, #footerCopyright"
  );
  
  if (copyrightElement) {
  copyrightElement.textContent =
  "© ${new Date().getFullYear()} XSUS Studio. ${getTranslation("footer")}";
  }
  }

/**

* Ndërron gjuhën e të gjithë ndërfaqes.

* 

* Përdorimi:

* window.setLanguage("sq")
  */
  function setLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
  return;
  }
  
  currentLang = language;
  
  try {
  localStorage.setItem("xsus_language", language);
  } catch (error) {
  console.warn("XSUS could not save language preference:", error);
  }
  
  document.documentElement.lang = language;
  
  translateDataAttributes();
  updateLanguageButtons();
  translateModuleCards();
  translateFooter();
  
  // Përputhshmëri me versionet e mëparshme të faqes.
  setTextById("hero-badge", getTranslation("heroBadge"));
  
  const heroTitle = document.getElementById("hero-title");
  
  if (heroTitle && !heroTitle.hasAttribute("data-i18n-html")) {
  heroTitle.innerHTML = getTranslation("heroTitle");
  } else {
  setTextById("heroBefore", getTranslation("heroBefore"));
  setTextById("heroHighlight", getTranslation("heroHighlight"));
  }
  
  setTextById("hero-subtitle", getTranslation("heroSub"));
  
  setTextById("loginLink", getTranslation("login"));
  setTextById("signupLink", getTranslation("signup"));
  setTextById("logoutButton", getTranslation("logout"));
  
  setTextById("txt-send", getTranslation("send"));
  setTextById("txt-clear", getTranslation("clear"));
  
  const input = document.getElementById("userInput");
  
  if (input) {
  input.placeholder = getTranslation("placeholder");
  }
  
  const welcomeMessage = document.getElementById("welcome-msg");
  
  if (welcomeMessage) {
  welcomeMessage.textContent = getTranslation("welcome");
  }
  
  window.dispatchEvent(
  new CustomEvent("xsus:languageChanged", {
  detail: { language }
  })
  );
  
  window.lucide?.createIcons();
  }

/**

* Ndryshon temën e mockup-it të telefonit,

* nëse ky komponent ekziston në faqe.
  */
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
  "flex-1 bg-slate-900 rounded-[28px] p-4 flex flex-col justify-between border ${colors[theme]} shadow-lg";
  }

/**

* Përditëson elementet e mockup-it sipas checkbox-eve.
  */
  function updateMockup() {
  ["ai", "scripts", "logo", "games"].forEach(name => {
  const checkbox = document.getElementById("chk-${name}");
  const item = document.getElementById("m-${name}");
  
   if (checkbox && item) {
     item.style.display = checkbox.checked ? "block" : "none";
 }
  
  });
  }

/**

* Lëviz në mënyrë të butë te një seksion.
  */
  function scrollToSection(id) {
  if (!id) return;
  
  document.getElementById(id)?.scrollIntoView({
  behavior: "smooth",
  block: "start"
  });
  }

/**

* Shmang injektimin e HTML-së nga mesazhet e përdoruesit
* ose përgjigjet e router-it.
  */
  function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
  "&": "&",
  "<": "<",
  ">": ">",
  '"': """,
  "'": "'"
  })[character]);
  }

/**

* Pastron bisedën dhe rikthen mesazhin fillestar.
  */
  function clearChat() {
  const stream = document.getElementById("chatStream");
  
  if (!stream) return;
  
  stream.replaceChildren();
  
  const wrapper = document.createElement("div");
  wrapper.className = "flex gap-3 max-w-3xl";
  
  const iconContainer = document.createElement("div");
  iconContainer.className =
  "w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0";
  
  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", "bot");
  icon.className = "w-4 h-4 text-cyan-400";
  
  iconContainer.appendChild(icon);
  
  const messageContainer = document.createElement("div");
  messageContainer.className =
  "glass-panel p-4 rounded-2xl rounded-tl-none border-slate-800 text-sm text-slate-200";
  
  const paragraph = document.createElement("p");
  paragraph.id = "welcome-msg";
  paragraph.textContent = getTranslation("welcome");
  
  messageContainer.appendChild(paragraph);
  wrapper.append(iconContainer, messageContainer);
  stream.appendChild(wrapper);
  
  window.lucide?.createIcons();
  
  window.dispatchEvent(
  new CustomEvent("xsus:chatCleared")
  );
  }

/**

* Merr tekstin e përgjigjes nga formatet e mundshme të router-it.
  */
  function extractResponseText(response) {
  if (typeof response === "string") {
  return response.trim();
  }
  
  if (!response || typeof response !== "object") {
  return "";
  }
  
  const candidates = [
  response.text,
  response.answer,
  response.response,
  response.content,
  response.message
  ];
  
  for (const candidate of candidates) {
  if (typeof candidate === "string" && candidate.trim()) {
  return candidate.trim();
  }
  }
  
  return "";
  }

/**

* Krijon dhe shton një mesazh të përdoruesit.
  */
  function appendUserMessage(message) {
  const stream = document.getElementById("chatStream");
  
  if (!stream) return;
  
  const bubble = document.createElement("div");
  bubble.className =
  "flex gap-3 max-w-3xl ml-auto justify-end";
  
  const messageContainer = document.createElement("div");
  messageContainer.className =
  "glass-panel p-4 rounded-2xl rounded-tr-none border-cyan-500/30 bg-cyan-950/30 text-sm text-cyan-100";
  
  const paragraph = document.createElement("p");
  paragraph.className = "whitespace-pre-wrap";
  paragraph.textContent = message;
  
  messageContainer.appendChild(paragraph);
  
  const avatar = document.createElement("div");
  avatar.className =
  "w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0 font-bold text-slate-950 text-xs";
  avatar.textContent = getTranslation("you");
  
  bubble.append(messageContainer, avatar);
  stream.appendChild(bubble);
  
  stream.scrollTop = stream.scrollHeight;
  }

/**

* Shfaq përgjigjen e AI-së.

* Teksti kalohet përmes escapeHtml para formatimit.
  */
  function appendAiMessage(message) {
  const stream = document.getElementById("chatStream");
  
  if (!stream) return;
  
  const safeMessage = String(message ?? "");
  
  const bubble = document.createElement("div");
  bubble.className = "flex gap-3 max-w-3xl";
  
  const iconContainer = document.createElement("div");
  iconContainer.className =
  "w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0";
  
  const icon = document.createElement("i");
  icon.setAttribute("data-lucide", "bot");
  icon.className = "w-4 h-4 text-cyan-400";
  
  iconContainer.appendChild(icon);
  
  const messageContainer = document.createElement("div");
  messageContainer.className =
  "glass-panel p-4 rounded-2xl rounded-tl-none border-slate-800 text-sm text-slate-200 leading-relaxed";
  
  const paragraph = document.createElement("p");
  
  paragraph.innerHTML = escapeHtml(safeMessage)
  .replace(/**(.*?)**/g, '<strong class="text-cyan-300 font-semibold">$1</strong>')
  .replace(/\n/g, "<br>");
  
  messageContainer.appendChild(paragraph);
  bubble.append(iconContainer, messageContainer);
  stream.appendChild(bubble);
  
  window.lucide?.createIcons();
  
  stream.scrollTop = stream.scrollHeight;
  }

/**

* Zbulim bazë i shqipes për ndërfaqen aktuale.

* Kjo nuk zëvendëson një sistem profesional të identifikimit të gjuhës.
  */
  function detectMessageLanguage(text) {
  const value = String(text).toLowerCase();
  
  const albanianMarkers = [
  "çfarë", "cfare",
  "është", "eshte",
  "më jep", "me jep",
  "si bëhet", "si behet",
  "dua", "për", "per",
  "shtëpi", "shtepi",
  "fjalë", "fjale",
  "mund të", "mund te",
  "pse", "kur", "ku",
  "si je", "faleminderit",
  "përshëndetje", "pershendetje"
  ];
  
  if (albanianMarkers.some(marker => value.includes(marker))) {
  return "sq";
  }
  
  return currentLang;
  }

/**

* Përgjigje rezervë kur router-i nuk prodhon tekst.

* 

* Kjo është përgjigje e thjeshtë lokale, jo pretendim

* se është kryer inferencë nga një model AI.
  */
  function generateSmartAiResponse(userPrompt, activeLang = currentLang) {
  const prompt = String(userPrompt).toLowerCase();
  
  const asksForVideo =
  prompt.includes("skenar") ||
  prompt.includes("video") ||
  prompt.includes("script");
  
  if (activeLang === "sq") {
  if (asksForVideo) {
  return [
  "🎬 Skenar videoje",
  "",
  "Titulli: Drita e Besimit dhe Shpresës",
  "",
  "Skena 1 (00:00–00:04)",
  "Pamja: Male gjatë lindjes së diellit.",
  'Zëri: "Edhe pas stuhisë, drita rikthehet."',
  "",
  "Skena 2 (00:04–00:10)",
  "Pamja: Drita e mëngjesit përhapet në natyrë.",
  '"Pas çdo vështirësie vjen lehtësimi."',
  "",
  "Thirrje për veprim: Ruaje dhe shpërndaje videon!"
  ].join("\n");
  }
  
   return `E mora kërkesën tënde: "${userPrompt}".\n\nPër momentin, router-i nuk dha një përgjigje të përdorshme. Provo përsëri ose kontrollo konfigurimin e shërbimit XSUS AI.`;
  
  }
  
  if (activeLang === "fr") {
  return "J’ai reçu votre demande : "${userPrompt}".\n\nLe routeur n’a pas fourni de réponse exploitable. Veuillez réessayer ou vérifier la configuration du service XSUS AI.";
  }
  
  return "I received your request: "${userPrompt}".\n\nThe router did not provide a usable response. Please try again or check the XSUS AI service configuration.";
  }

/**

* Aktivizon ose çaktivizon kontrollet e dërgimit.
  */
  function setChatControlsDisabled(disabled) {
  const form = document.getElementById("chatForm") ||
  document.getElementById("userInput")?.closest("form");
  
  if (!form) return;
  
  form.querySelectorAll(
  'button[type="submit"], input[type="submit"]'
  ).forEach(button => {
  button.disabled = disabled;
  button.setAttribute("aria-busy", String(disabled));
  });
  }

/**

* Përpunon kërkesën e përdoruesit.
  */
  async function handleChatSubmit(event) {
  event?.preventDefault();
  
  if (chatIsProcessing) return;
  
  const input = document.getElementById("userInput");
  const stream = document.getElementById("chatStream");
  
  if (!input || !stream) return;
  
  const userText = input.value.trim();
  
  if (!userText) return;
  
  chatIsProcessing = true;
  setChatControlsDisabled(true);
  
  appendUserMessage(userText);
  
  input.value = "";
  
  const targetLang = detectMessageLanguage(userText);
  
  let responseText = "";
  
  try {
  // Router-i ekzistues mbetet rruga kryesore e përpunimit.
  const routerResponse = await smartRouter(userText, targetLang);
  
   responseText = extractResponseText(routerResponse);

 if (!responseText) {
     responseText = generateSmartAiResponse(
         userText,
         targetLang
     );
 }
  
  } catch (error) {
  console.error("XSUS AI router error:", error);
  
   responseText = getTranslation("error", targetLang);
  
  } finally {
  chatIsProcessing = false;
  setChatControlsDisabled(false);
  }
  
  appendAiMessage(
  responseText || getTranslation("emptyResponse", targetLang)
  );
  
  input.focus();
  }

/**

* Lidh kontrollin e gjuhës.

* Mbështet si select-in e ri, ashtu edhe butonat e vjetër.
  */
  function initializeLanguageControls() {
  const selector = document.getElementById("languageSelect");
  
  if (selector && !selector.dataset.xsusLanguageBound) {
  selector.addEventListener("change", event => {
  setLanguage(event.target.value);
  });
  
   selector.dataset.xsusLanguageBound = "true";
  
  }
  
  SUPPORTED_LANGUAGES.forEach(language => {
  const button = document.getElementById("lang-${language}");
  
   if (!button || button.dataset.xsusLanguageBound) {
     return;
 }

 button.addEventListener("click", () => {
     setLanguage(language);
 });

 button.dataset.xsusLanguageBound = "true";
  
  });
  }

/**

* Inicializimi i ndërfaqes.
  */
  function initializeXSUSStudio() {
  initializeLanguageControls();
  
  const chatForm =
  document.getElementById("chatForm") ||
  document.getElementById("userInput")?.closest("form");
  
  if (chatForm && !chatForm.dataset.xsusChatBound) {
  chatForm.addEventListener("submit", handleChatSubmit);
  chatForm.dataset.xsusChatBound = "true";
  }
  
  const input = document.getElementById("userInput");
  
  if (input && !input.dataset.xsusKeyboardBound) {
  input.addEventListener("keydown", event => {
  if (
  event.key === "Enter" &&
  !event.shiftKey &&
  !event.isComposing
  ) {
  event.preventDefault();
  
           // Përdor vetëm rrugën e përbashkët të dërgimit.
         handleChatSubmit(event);
     }
 });

 input.dataset.xsusKeyboardBound = "true";
  
  }
  
  setLanguage(currentLang);
  
  window.lucide?.createIcons();
  }

if (document.readyState === "loading") {
document.addEventListener(
"DOMContentLoaded",
initializeXSUSStudio,
{ once: true }
);
} else {
initializeXSUSStudio();
}

// API publike për HTML-në dhe modulet e tjera.
window.setLanguage = setLanguage;
window.setAppTheme = setAppTheme;
window.updateMockup = updateMockup;
window.scrollToSection = scrollToSection;
window.clearChat = clearChat;
window.handleChatSubmit = handleChatSubmit;
window.appendAiMessage = appendAiMessage;
window.getXSUSLanguage = () => currentLang;
window.XSUS_TRANSLATIONS = translations;
