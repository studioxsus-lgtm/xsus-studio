
import { describe, it, expect } from 'vitest';
import {
  searchKnowledge,
  getKnowledgeStats
} from './knowledge-service.js';

describe('XSUS JavaScript Knowledge', () => {
  it('should load JavaScript knowledge documents', () => {
    const stats = getKnowledgeStats();

    expect(stats.javascriptDocuments).toBeGreaterThan(0);
  });

  it('should find JavaScript fundamentals in Albanian', () => {
    const results = searchKnowledge(
      'JavaScript variabla let const',
      'sq',
      4
    );

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((doc) =>
        /javascript|variabla|bazat/i.test(
          `${doc.title} ${doc.content}`
        )
      )
    ).toBe(true);
  });

  it('should find JavaScript fundamentals in English', () => {
    const results = searchKnowledge(
      'JavaScript variables let const',
      'en',
      4
    );

    expect(results.length).toBeGreaterThan(0);
  });
});
