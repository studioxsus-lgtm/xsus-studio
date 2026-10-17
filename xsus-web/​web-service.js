/**
 * XSUS Web Service
 * Integruar me shërbimin qendror XSUS AI (services/xsus-ai-service.js)
 * Menaxhon kërkesat e AI-t për gjenerimin e faqeve web.
 */

const ALLOWED_TEMPLATES = [
    "news",
    "landing",
    "ecommerce",
    "portfolio"
];

const LANGUAGE_NAMES = {
    en: "English",
    sq: "Albanian",
    fr: "French"
};

/**
 * Importon shërbimin qendror të AI-t në mënyrë dinamike (nëse ekziston)
 */
async function getCentralAiService() {
    try {
        const aiService = await import('../services/xsus-ai-service.js');
        return aiService;
    } catch (e) {
        console.warn("Shërbimi qendror xsus-ai-service.js nuk u gjet, po përdoret lidhja direkte:", e);
        return null;
    }
}

/**
 * Gjeneron një faqe web në bazë të prompt-it, template-it dhe gjuhës.
 * @param {string} prompt - Koncepti ose kërkesa e përdoruesit
 * @param {string} template - Lloji i modelit (news, landing, ecommerce, portfolio)
 * @param {string} language - Gjuha e preferuar (en, sq, fr)
 * @returns {Promise<string>} - Kthen kodin e pastër HTML të gjeneruar
 */
export async function generateWebsiteCode(prompt, template = "news", language = "en") {
    // 1. Validimi i të dhënave
    const cleanPrompt = prompt ? prompt.trim() : "";
    if (!cleanPrompt || cleanPrompt.length > 4000) {
        throw new Error("Prompt must contain between 1 and 4000 characters.");
    }

    if (!ALLOWED_TEMPLATES.includes(template)) {
        throw new Error("Unsupported website template type.");
    }

    const outputLanguage = LANGUAGE_NAMES[language] || "English";

    // 2. Udhëzimi kryesor për AI
    const systemPrompt = `
You are the website generation engine for XSUS Web.

Generate one complete, self-contained HTML5 document.
Include all CSS inside a style element.
Use vanilla JavaScript only when needed.
Do not use external JavaScript libraries.
Make the design responsive for phones, tablets and desktops.
Create a polished, accessible, professional website.
Use semantic HTML and realistic sample content.
The website must reflect the user's requested concept.
Use this template category: ${template}.
Use ${outputLanguage} for visible website text.

Return ONLY the HTML document.
Do not use Markdown fences or explanations.
`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: cleanPrompt }
    ];

    // 3. Provohet lidhja përmes shërbimit qendror XSUS AI
    const centralService = await getCentralAiService();
    if (centralService && typeof centralService.queryAiEngine === 'function') {
        try {
            const result = await centralService.queryAiEngine(messages, { model: 'openai' });
            return cleanHtmlOutput(result);
        } catch (err) {
            console.warn("Dështoi përgjigja nga shërbimi qendror, po kalojmë te thirrja direkte...", err);
        }
    }

    // 4. Mënyra rezervë (Direct Pollinations API Call)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: messages,
                model: "openai"
            }),
            cache: "no-store",
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Website provider error: ${response.status}`);
        }

        const rawText = await response.text();
        return cleanHtmlOutput(rawText);

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error("Request timed out. The AI took too long to respond.");
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Pastron kodin e kthyer nga AI
 */
function cleanHtmlOutput(html) {
    if (!html) return "";
    let clean = html.trim();
    clean = clean
        .replace(/^```(?:html)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    return clean;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateWebsiteCode, ALLOWED_TEMPLATES };
}
