/**
 * XSUS Web Service
 * Menaxhon lidhjen me motorin e AI-t për gjenerimin e faqeve web,
 * validimin e të dhënave dhe përpunimin e përgjigjeve.
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
 * Gjeneron një faqe web në bazë të prompt-it, template-it dhe gjuhës.
 * @param {string} prompt - Koncepti ose kërkesa e përdoruesit
 * @param {string} template - Lloji i modelit (news, landing, ecommerce, portfolio)
 * @param {string} language - Gjuha e preferuar (en, sq, fr)
 * @returns {Promise<string>} - Kthen kodin e pastër HTML të gjeneruar
 */
async function generateWebsiteCode(prompt, template = "news", language = "en") {
    // 1. Validimi i prompt-it
    const cleanPrompt = prompt ? prompt.trim() : "";
    if (!cleanPrompt || cleanPrompt.length > 4000) {
        throw new Error("Prompt must contain between 1 and 4000 characters.");
    }

    // 2. Validimi i template-it
    if (!ALLOWED_TEMPLATES.includes(template)) {
        throw new Error("Unsupported website template type.");
    }

    const outputLanguage = LANGUAGE_NAMES[language] || "English";

    // 3. Krijimi i udhëzimit të sistemit për AI
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
Do not include instructions to navigate the parent page.
Do not access parent frames, cookies, storage or browser APIs
outside the preview document.
`;

    // 4. Vendosja e Timeout (60 sekonda)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: cleanPrompt }
                ],
                model: "openai"
            }),
            cache: "no-store",
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Website provider error: ${response.status}`);
        }

        let html = (await response.text()).trim();

        // Heqja e bllokut të Markdown nëse gjendet aksidentalisht
        html = html
            .replace(/^```(?:html)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();

        // 5. Validimi bazë i strukturës HTML
        if (
            !/^<!doctype html/i.test(html) ||
            !/<html[\s>]/i.test(html) ||
            !/<\/html>/i.test(html) ||
            html.length > 500_000
        ) {
            throw new Error("The AI returned invalid or oversized HTML. Try again.");
        }

        return html;

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error("Request timed out. The AI took too long to respond.");
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

// Eksportimi i funksionit nëse përdoret me module (ose për t'u thirrur globalisht)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateWebsiteCode, ALLOWED_TEMPLATES };
}
