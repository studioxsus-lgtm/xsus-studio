
import { describe, expect, test } from 'vitest';

import {
  searchKnowledge,
  registerKnowledgeSource,
  listKnowledgeSources
} from '../../src/knowledge/knowledge-service.js';

describe('XSUS Knowledge Service', () => {
  test('trajton pyetjen bosh', async () => {
    const result = await searchKnowledge('   ');

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
  });

  test('kërkon njohuri për JavaScript', async () => {
    const result = await searchKnowledge('JavaScript', {
      language: 'en'
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });

  test('kërkon njohuri në shqip', async () => {
    const result = await searchKnowledge('programim', {
      language: 'sq'
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });

  test('regjistron dhe heq një burim shtesë', async () => {
    const sourceName = 'test-source-temporary';

    const removeSource = registerKnowledgeSource(
      sourceName,
      async query => [{
        title: 'Test',
        content: `Përgjigje për ${query}`
      }]
    );

    try {
      expect(listKnowledgeSources()).toContain(sourceName);

      const result = await searchKnowledge('test query');

      expect(
        result.results.some(item => item.source === sourceName)
      ).toBe(true);
    } finally {
      removeSource();
    }

    expect(listKnowledgeSources()).not.toContain(sourceName);
  });

  test('kthen burimin dhe përmbajtjen e rezultateve', async () => {
    const result = await searchKnowledge('JavaScript', {
      language: 'en',
      limit: 5
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty('content');
    expect(result.results[0]).toHaveProperty('source');
  });
});
