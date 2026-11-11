import { makeSection } from './sections.js';
import { nextPageId, t } from './state.js';

export function template(kind) {
  const page = { id: nextPageId(), path: 'index.html', name: t('home'), accent: kind === 'portfolio' ? '#baa6f5' : '#b9e6a9', font: 'sans', sections: [] };
  if (kind === 'blank') {
    page.sections.push(makeSection('hero', t('blankHero'), t('blankBody')));
  } else {
    const hero = makeSection('hero', t(kind === 'studio' ? 'studioHero' : 'portfolioHero'), t(kind === 'studio' ? 'studioBody' : 'portfolioBody'));
    const work = makeSection('work', t('studioWork'), t('studioWorkBody'));
    hero.action = t('workLink');
    hero.target = work.id;
    page.sections.push(hero, work, makeSection('contact'));
  }
  return page;
}
