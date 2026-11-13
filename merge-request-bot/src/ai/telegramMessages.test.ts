import test from 'node:test';
import assert from 'node:assert/strict';
import type { AxiosInstance } from 'axios';
import { createTelegramMessages } from './telegramMessages.js';
import { readAiReviewConfig } from './aiReview.js';

test('uses a local fallback when AI is disabled or fails', async () => {
  const ai = { async post() { throw new Error('offline'); } } as unknown as AxiosInstance;
  for (const AI_URL of ['', 'http://localhost:1234/v1']) {
    const messages = createTelegramMessages({ ai, config: readAiReviewConfig({ AI_URL, AI_MODEL: 'example' }) });
    assert.equal(await messages.getRandomPhraseWithCounter(['Всего ${mrCounter} MR'], 12), 'Всего 12 MR\n');
  }
});

test('escapes generated HTML and preserves factual message text', async () => {
  const ai = { async post() { return { data: { choices: [{ message: { content: '<b>Привет</b>' } }] } }; } } as unknown as AxiosInstance;
  const messages = createTelegramMessages({ ai,
    config: readAiReviewConfig({ AI_URL: 'http://localhost:1234/v1', AI_MODEL: 'example' }),
  });
  assert.equal(await messages.getRandomMessage(['Привет'], 'MR: 7', '', { html: true }), '&lt;b&gt;Привет&lt;/b&gt;\nMR: 7');
});
