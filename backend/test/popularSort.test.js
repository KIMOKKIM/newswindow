import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePopularArticlesDesc } from '../db/articles.shared.js';

test('comparePopularArticlesDesc: views then published_at', () => {
  const a = { views: 5, published_at: '2024-01-02', created_at: '2024-01-01' };
  const b = { views: 10, published_at: '2024-01-01', created_at: '2024-01-01' };
  assert.ok(comparePopularArticlesDesc(a, b) > 0);
});

test('comparePopularArticlesDesc: tie views newer published wins', () => {
  const a = { views: 3, published_at: '2024-02-01', created_at: '2024-01-01' };
  const b = { views: 3, published_at: '2024-03-01', created_at: '2024-01-01' };
  assert.ok(comparePopularArticlesDesc(a, b) > 0);
});
