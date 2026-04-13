import test from 'node:test';
import assert from 'node:assert/strict';
import { publicThumbUrlOnly } from '../db/articles.shared.js';

test('publicThumbUrlOnly: absolutizes /storage/v1 path with SUPABASE_URL', () => {
  const prev = process.env.SUPABASE_URL;
  process.env.SUPABASE_URL = 'https://xyzcompany.supabase.co';
  try {
    const u = publicThumbUrlOnly({
      id: 1,
      image1: '/storage/v1/object/public/bucket/key.jpg',
    });
    assert.equal(u, 'https://xyzcompany.supabase.co/storage/v1/object/public/bucket/key.jpg');
  } finally {
    if (prev === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = prev;
  }
});

test('publicThumbUrlOnly: object/public without host still works', () => {
  const prev = process.env.SUPABASE_URL;
  process.env.SUPABASE_URL = 'https://xyzcompany.supabase.co';
  try {
    const u = publicThumbUrlOnly({
      id: 2,
      image1: 'object/public/bucket/key.jpg',
    });
    assert.equal(u, 'https://xyzcompany.supabase.co/storage/v1/object/public/bucket/key.jpg');
  } finally {
    if (prev === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = prev;
  }
});
