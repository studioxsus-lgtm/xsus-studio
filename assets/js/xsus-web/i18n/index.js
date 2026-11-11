import sq from './sq.js';
import en from './en.js';
import fr from './fr.js';

const dictionaries = { sq, en, fr };

export function translate(key, language) {
  return dictionaries[language]?.[key] ?? key;
}
