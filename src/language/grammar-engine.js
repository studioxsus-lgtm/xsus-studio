
import {
  normalizeText,
  normalizeLanguageCode
} from './normalization.js';

/**
 * XSUS AI — Grammar Engine
 * Analizë bazë e tekstit, pa u kufizuar në një gjuhë.
 *
 * Ky modul nuk pretendon të bëjë ende analizë
 * të plotë gramatikore për çdo gjuhë.
 */

export function analyzeGrammar(input, language = 'auto') {
  if (typeof input !== 'string' || !input.trim()) {
    return {
      valid: false,
      language: normalizeLanguageCode(language),
      text: '',
      wordCount: 0,
      sentenceCount: 0,
      issues: ['Teksti është bosh ose i pavlefshëm.']
    };
  }

  const text = normalizeText(input);

  const words = text.match(/[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu) || [];

  const sentences = text
    .split(/[.!?。！？؟]+(?:\s+|$)/u)
    .filter(sentence => sentence.trim().length > 0);

  const issues = [];

  if (words.length === 0) {
    issues.push('Nuk u gjetën fjalë të dallueshme.');
  }

  return {
    valid: words.length > 0,
    language: normalizeLanguageCode(language),
    text,
    wordCount: words.length,
    sentenceCount: sentences.length || (text ? 1 : 0),
    issues,
    analysisLevel: 'basic',
    requiresLanguageSpecificRules: true
  };
}

export function isGrammarEngineSupported() {
  return true;
}
