import test from 'node:test';
import assert from 'node:assert/strict';
import type { AxiosInstance } from 'axios';
import { createAiReviewer, extractMergeRequestLinks, parseMergeRequestUrl, readAiReviewConfig } from './aiReview.js';

const base = 'https://gitlab.example.com';
const url = `${base}/team/project/-/merge_requests/7`;

test('parses configured hosts, nested projects and Telegram hidden links', () => {
  assert.equal(parseMergeRequestUrl(`${url}?view=parallel#diff`, base)?.projectPath, 'team/project');
  assert.equal(parseMergeRequestUrl('https://other.example.com/team/project/-/merge_requests/7', base), null);
  assert.deepEqual(extractMergeRequestLinks({ text: `review ${url}`, entities: [
    { type: 'text_link', offset: 0, length: 6, url },
  ] }, base), [url]);
});

function fixture({ duplicate = false, stale = false, fail = false } = {}) {
  const posts: string[] = [];
  let reads = 0;
  const gitlab = {
    async get(endpoint: string) {
      if (endpoint.endsWith('/discussions')) return { data: duplicate ? [{ notes: [{ body: '<!-- local-ai-review:abc -->' }] }] : [] };
      if (endpoint.endsWith('/changes')) return { data: { sha: 'abc', changes: [
        { old_path: 'app.ts', new_path: 'app.ts', diff: '+const value = 1;' },
      ] } };
      reads++;
      return { data: { state: 'opened', sha: stale && reads > 1 ? 'new' : 'abc', title: 'Example change' } };
    },
    async post(endpoint: string) { posts.push(endpoint); return { data: { id: 'discussion' } }; },
  } as unknown as AxiosInstance;
  const ai = { async post() {
    if (fail) throw new Error('Model unavailable');
    return { data: { choices: [{ message: { content: 'Подтверждённых проблем нет.' } }] } };
  } } as unknown as AxiosInstance;
  const reviewer = createAiReviewer({ gitlab, ai, gitlabUrl: base,
    config: readAiReviewConfig({ AI_URL: 'http://localhost:1234/v1', AI_MODEL: 'example-model' }),
  });
  return { reviewer, posts };
}

test('publishes a separate discussion for the current SHA', async () => {
  const { reviewer, posts } = fixture();
  assert.equal((await reviewer.review(url)).status, 'published');
  assert.equal(posts.length, 1);
});

test('does not publish duplicate or outdated reviews', async () => {
  for (const options of [{ duplicate: true }, { stale: true }]) {
    const { reviewer, posts } = fixture(options);
    assert.equal((await reviewer.review(url)).status, options.duplicate ? 'duplicate' : 'stale');
    assert.equal(posts.length, 0);
  }
});

test('releases in-flight state after AI failure so review can be retried', async () => {
  const { reviewer, posts } = fixture({ fail: true });
  await assert.rejects(reviewer.review(url), /Model unavailable/);
  await assert.rejects(reviewer.review(url), /Model unavailable/);
  assert.equal(posts.length, 0);
});
