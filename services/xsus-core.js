// services/xsus-core.js - Bërthama Qendrore e Xsus Studio
import { xsusCoreKnowledge } from './core-knowledge.js';

export class XsusCoreEngine {
    constructor() {
        this.knowledge = xsusCoreKnowledge;
    }

    /**
     * Merr përgjigje ose mjete të dedikuara sipas modulit kërkues
     * @param {string} moduleName - Emri i modulit ('xsus-ai', 'xsus-web', 'xsus-app', 'xsus-game', 'xsus-logo')
     * @param {string} query - Pyetja ose kërkesa e përdoruesit
     * @param {string} lang - Gjuha ('sq', 'en', 'fr')
     */
    requestAccess(moduleName, query, lang = 'sq') {
        if (!query) return null;
        const cleanQuery = query.toLowerCase().trim().replace(/[?.,!]/g, '');

        switch (moduleName) {
            case 'xsus-ai':
                // Xsus AI ka akses të plotë në të gjitha njohuritë e bërthamës
                return this.knowledge.findInstantAnswer(cleanQuery, lang);

            case 'xsus-web':
                // Akses i specializuar vetëm për terma, mjete dhe zhvillim ueb-i
                if (this._isWebQuery(cleanQuery)) {
                    return this.knowledge.findInstantAnswer(cleanQuery, lang) || 
                           this._getWebContext(cleanQuery, lang);
                }
                return null;

            case 'xsus-app':
                // Akses vetëm për aplikacione dhe sisteme mobile/desktop
                if (cleanQuery.includes('app') || cleanQuery.includes('aplikacion') || cleanQuery.includes('android') || cleanQuery.includes('ios')) {
                    return this.knowledge.findInstantAnswer(cleanQuery, lang);
                }
                return null;

            case 'xsus-game':
                // Akses vetëm për zhvillim lojërash dhe grafikë
                if (cleanQuery.includes('game') || cleanQuery.includes('lojë') || cleanQuery.includes('graphics')) {
                    return this.knowledge.findInstantAnswer(cleanQuery, lang);
                }
                return null;

            case 'xsus-logo':
                // Akses vetëm për dizajn dhe brending
                if (cleanQuery.includes('logo') || cleanQuery.includes('design') || cleanQuery.includes('brand')) {
                    return this.knowledge.findInstantAnswer(cleanQuery, lang);
                }
                return null;

            default:
                return this.knowledge.findInstantAnswer(cleanQuery, lang);
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
