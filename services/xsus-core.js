// services/xsus-core.js - Bërthama Qendrore e Xsus Studio
import { sqKnowledge, findSqAnswer } from './sq-knowledge.js';
import { frKnowledge, findFrAnswer } from './fr-knowledge.js';
import { enKnowledge, findEnAnswer } from './en-knowledge.js';

export class XsusCoreEngine {
    constructor() {
        // Ruajmë fjalorët e ndarë sipas gjuhëve dhe funksionet e tyre të kërkimit
        this.dictionaries = {
            sq: { data: sqKnowledge, find: findSqAnswer },
            fr: { data: frKnowledge, find: findFrAnswer },
            en: { data: enKnowledge, find: findEnAnswer }
        };
    }

    /**
     * Merr përgjigje ose mjete të dedikuara sipas modulit kërkues dhe gjuhës
     * @param {string} moduleName - Emri i modulit ('xsus-ai', 'xsus-web', 'xsus-app', 'xsus-game', 'xsus-logo')
     * @param {string} query - Pyetja ose kërkesa e përdoruesit
     * @param {string} lang - Gjuha ('sq', 'en', 'fr')
     * @param {object} extraContext - Konteksti shtesë (p.sh. grammarContext nga router.js)
     */
    requestAccess(moduleName, query, lang = 'sq', extraContext = {}) {
        if (!query) return null;
        const cleanQuery = query.toLowerCase().trim().replace(/[?.,!]/g, '');

        // Zgjedhim fjalorin sipas gjuhës, me zgjedhje të paracaktuar shqipen ('sq')
        const currentLang = this.dictionaries[lang] ? lang : 'sq';
        const dict = this.dictionaries[currentLang];

        // -------------------------------------------------------------
        // RREGULLI KRYESOR I GJUHËS SHQIPE (System Instruction Guard)
        // -------------------------------------------------------------
        const languageGuard = currentLang === 'sq' ? {
            systemInstruction: `
[RREGULL ABSOLUT I GJUHËS - XSUS STUDIO CORE]:
- Përdoruesi po komunikon në GJUHËN SHQIPE.
- PËRGJIGJU KATEGORIKISHT VETËM NË SHQIP.
- MOS E PËRKTHE fjalinë në anglisht ose frëngjisht.
- MOS jep shpjegime gramatikore apo përkthime në anglisht përveçse nëse përdoruesi e kërkon shprehimisht.
- Trajtoje mesazhin si bisedë natyrale ose pyetje direkte dhe përgjigju në mënyrë ndihmuese në shqip.
`,
            grammarContext: extraContext.grammarContext || null
        } : null;

        let reply = null;

        switch (moduleName) {
            case 'xsus-ai':
                reply = dict.find ? dict.find(cleanQuery) : null;
                break;

            case 'xsus-web':
                if (this._isWebQuery(cleanQuery)) {
                    reply = (dict.find ? dict.find(cleanQuery) : null) || 
                            this._getWebContext(cleanQuery, currentLang);
                }
                break;

            case 'xsus-app':
                if (cleanQuery.includes('app') || cleanQuery.includes('aplikacion') || cleanQuery.includes('android') || cleanQuery.includes('ios')) {
                    reply = dict.find ? dict.find(cleanQuery) : null;
                }
                break;

            case 'xsus-game':
                if (cleanQuery.includes('game') || cleanQuery.includes('lojë') || cleanQuery.includes('graphics')) {
                    reply = dict.find ? dict.find(cleanQuery) : null;
                }
                break;

            case 'xsus-logo':
                if (cleanQuery.includes('logo') || cleanQuery.includes('design') || cleanQuery.includes('brand')) {
                    reply = dict.find ? dict.find(cleanQuery) : null;
                }
                break;

            default:
                reply = dict.find ? dict.find(cleanQuery) : null;
                break;
        }

        // Nëse ka përgjigje direkte nga fjalori lokal, e kthen atë
        if (reply) return reply;

        // Nëse nuk gjendet te fjalori lokal, mund t'i vendosësh udhëzimet e gjuhës për backend-in/LLM
        if (languageGuard && typeof window !== 'undefined') {
            window.__XSUS_ACTIVE_GUARD__ = languageGuard;
        }

        return null;
    }

    _isWebQuery(query) {
        const webKeywords = ['web', 'site', 'website', 'html', 'css', 'javascript', 'js', 'domain', 'host', 'faqe'];
        return webKeywords.some(kw => query.includes(kw));
    }

    _getWebContext(query, lang) {
        const webReplies = {
            sq: "Xsus Web Core: Moduli i zhvillimit të ueb-it ofron kompozim kodi, optimizim SEO dhe dizajn responsive.",
            en: "Xsus Web Core: Web development module provides code composition, SEO optimization, and responsive design.",
            fr: "Xsus Web Core: Le module de développement web offre la composition de code, l'optimisation SEO et le design réactif."
        };
        return webReplies[lang] || webReplies['en'];
    }
}

// Instanca unike e bërthamës për të gjithë sistemin
export const studioCore = new XsusCoreEngine();
