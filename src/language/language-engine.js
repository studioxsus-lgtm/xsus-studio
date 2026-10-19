
import {
  normalizeText,
  normalizeLanguageCode,
  getBaseLanguage
} from './normalization.js';

import { analyzeGrammar } from './grammar-engine.js';

/**
 * XSUS AI — International Language Engine
 * Baza fillestare për përpunimin shumëgjuhësh.
 */

export function analyzeLanguage(input, options = {}) {
  const text = normalizeText(input);

  const requestedLanguage = normalizeLanguageCode(
    options.language || 'auto'
  );

  const language = requestedLanguage === 'auto'
    ? detectLanguage(text)
    : requestedLanguage;

  return {
    text,
    language,
    baseLanguage: getBaseLanguage(language),
    isEmpty: text.length === 0,
    grammar: analyzeGrammar(text, language),
    metadata: {
      engine: 'xsus-international-language-engine',
      version: '1.0.0',
      detectionMethod:
        requestedLanguage === 'auto'
          ? 'heuristic'
          : 'provided'
    }
  };
}

/**
 * Zbulim fillestar me shenja karakteristike.
 * Nuk zëvendëson një model profesional të zbulimit të gjuhës.
 */
export function detectLanguage(input) {
  const text = normalizeText(input);

  if (!text) {
    return 'und';
  }

  if (/[\u0600-\u06FF]/u.test(text)) return 'ar';
  if (/[\u4E00-\u9FFF]/u.test(text)) return 'zh';
  if (/[\u3040-\u30FF]/u.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/u.test(text)) return 'ko';
  if (/[\u0400-\u04FF]/u.test(text)) return 'ru';

  const words = text.match(/\p{L}+/gu) || [];
  const sample = ` ${words.join(' ')} `;

  const signatures = [
    {
      language: 'sq',
      words: [' dhe ', ' është ', ' për ', ' një ', ' që ']
    },
    {
      language: 'en',
      words: [' the ', ' is ', ' are ', ' and ', ' what ']
    },
    {
      language: 'fr',
      words: [' le ', ' la ', ' les ', ' est ', ' et ', ' une ']
    },
    {
      language: 'de',
      words: [' der ', ' die ', ' das ', ' und ', ' ist ']
    },
    {
      language: 'es',
      words: [' el ', ' los ', ' las ', ' que ', ' es ']
    },
    {
      language: 'it',
      words: [' il ', ' gli ', ' che ', ' una ', ' sono ']
    },
    {
      language: 'pt',
      words: [' não ', ' uma ', ' são ', ' que ', ' para ']
    },
    {
      language: 'nl',
      words: [' het ', ' een ', ' van ', ' zijn ', ' niet ']
    }
  ];

  let bestLanguage = 'und';
  let bestScore = 0;

  for (const signature of signatures) {
    const score = signature.words.reduce(
      (total, word) =>
        total + (sample.includes(word) ? 1 : 0),
      0
    );

    if (score > bestScore) {
      bestScore = score;
      bestLanguage = signature.language;
    }
  }

  return bestScore > 0 ? bestLanguage : 'und';
}

export function getLanguageInfo(language) {
  const code = normalizeLanguageCode(language);

  if (code === 'auto') {
    return {
      code,
      baseLanguage: 'auto',
      name: 'Automatic detection'
    };
  }

  let name = code;

  try {
    name = new Intl.DisplayNames(['en'], {
      type: 'language'
    }).of(code) || code;
  } catch {
    // Mbajmë kodin kur emri nuk mund të gjendet.
  }

  return {
    code,
    baseLanguage: getBaseLanguage(code),
    name
  };
}
