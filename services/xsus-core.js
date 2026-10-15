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
     */
    requestAccess(moduleName, query, lang = 'sq') {
        if (!query) return null;
        const cleanQuery = query.toLowerCase().trim().replace(/[?.,!]/g, '');

        // Zgjedhim fjalorin sipas gjuhës, me zgjedhje të paracaktuar shqipen ('sq')
        const currentLang = this.dictionaries[lang] ? lang : 'sq';
        const dict = this.dictionaries[currentLang];

        switch (moduleName) {
            case 'xsus-ai':
                // Kërkon te fjalori përkatës i gjuhës
                return dict.find ? dict.find(cleanQuery) : null;

            case 'xsus-web':
                if (this._isWebQuery(cleanQuery)) {
                    return (dict.find ? dict.find(cleanQuery) : null) || 
                           this._getWebContext(cleanQuery, currentLang);
                }
                return null;

            case 'xsus-app':
                if (cleanQuery.includes('app') || cleanQuery.includes('aplikacion') || cleanQuery.includes('android') || cleanQuery.includes('ios')) {
                    return dict.find ? dict.find(cleanQuery) : null;
                }
                return null;

            case 'xsus-game':
                if (cleanQuery.includes('game') || cleanQuery.includes('lojë') || cleanQuery.includes('graphics')) {
                    return dict.find ? dict.find(cleanQuery) : null;
                }
                return null;

            case 'xsus-logo':
                if (cleanQuery.includes('logo') || cleanQuery.includes('design') || cleanQuery.includes('brand')) {
                    return dict.find ? dict.find(cleanQuery) : null;
                }
                return null;

            default:
                return dict.find ? dict.find(cleanQuery) : null;
        }
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
