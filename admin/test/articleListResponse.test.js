import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArticlesListResponse } from '../src/lib/articleListResponse.js';

test('normalizeArticlesListResponse: raw array', () => {
  const a = [{ id: 1 }];
  assert.deepEqual(normalizeArticlesListResponse(a), a);
});

test('normalizeArticlesListResponse: { articles: [] }', () => {
  assert.deepEqual(normalizeArticlesListResponse({ articles: [{ id: 2 }] }), [{ id: 2 }]);
});

test('normalizeArticlesListResponse: unknown shape → []', () => {
  assert.deepEqual(normalizeArticlesListResponse({ foo: 1 }), []);
});

test('normalizeArticlesListResponse: { rows: [...] }', () => {
  assert.deepEqual(normalizeArticlesListResponse({ rows: [{ id: 3 }] }), [{ id: 3 }]);
});

test('normalizeArticlesListResponse: { body: { articles } }', () => {
  assert.deepEqual(normalizeArticlesListResponse({ body: { articles: [{ id: 4 }] } }), [{ id: 4 }]);
});
