#!/usr/bin/env node
/**
 * backfill-upload-images.js
 *
 * Scan articles table for image1..image4 fields that contain data:URI (base64)
 * and upload each to Supabase Storage, replacing the DB value with the public URL.
 *
 * Usage:
 *   NODE_ENV=production node backend/scripts/backfill-upload-images.js
 *
 * Notes:
 * - Requires SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or NW_PUBLIC_SUPABASE_URL) in env.
 * - Runs in batches of 5 articles to limit load.
 */
import { assertSupabase } from '../lib/supabaseServer.js';
import { parseDataUri, uploadDataUriToStorage } from '../db/articles.supabase.js';

async function sb() {
  return assertSupabase();
}

function hasDataUri(s) {
  return s && typeof s === 'string' && s.indexOf('data:') === 0;
}

async function processArticle(row) {
  const updates = {};
  for (const n of [1,2,3,4]) {
    const k = 'image' + n;
    const val = row[k];
    if (hasDataUri(val)) {
      try {
        const uploaded = await uploadDataUriToStorage(val, `article${row.id}-${k}`);
        if (uploaded) {
          updates[k] = uploaded;
          console.log(`[backfill] uploaded article=${row.id} ${k} -> ${uploaded}`);
        } else {
          console.error(`[backfill] upload failed article=${row.id} ${k}`);
        }
      } catch (e) {
        console.error(`[backfill] upload exception article=${row.id} ${k}`, String(e && e.message ? e.message : e));
      }
    }
  }
  if (Object.keys(updates).length === 0) return { id: row.id, ok: false, reason: 'no-data-uri' };
  try {
    const client = await sb();
    const { data, error } = await client.from('articles').update(updates).eq('id', row.id).select('id,image1,image2,image3,image4').single();
    if (error) {
      console.error('[backfill] db update failed', { articleId: row.id, err: error });
      return { id: row.id, ok: false, reason: String(error) };
    }
    return { id: row.id, ok: true, updated: data };
  } catch (e) {
    console.error('[backfill] db update exception', { articleId: row.id, err: String(e && e.message ? e.message : e) });
    return { id: row.id, ok: false, reason: String(e && e.message ? e.message : e) };
  }
}

async function main() {
  const client = await sb();
  console.log('[backfill] starting scan for data:URI images');
  // Find rows where any imageN contains 'data:' prefix.
  const orFilter = [
    "image1.ilike.%data:%",
    "image2.ilike.%data:%",
    "image3.ilike.%data:%",
    "image4.ilike.%data:%",
  ].join(',');
  const pageSize = 5;
  let from = 0;
  const results = [];
  for (;;) {
    const q = client.from('articles').select('id,image1,image2,image3,image4').or(orFilter).range(from, from + pageSize - 1);
    const { data, error } = await q;
    if (error) {
      console.error('[backfill] list query error', error);
      break;
    }
    if (!data || data.length === 0) break;
    // Process sequentially per batch to limit concurrency
    for (const row of data) {
      const r = await processArticle(row);
      results.push(r);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log('[backfill] done. summary:', {
    totalFound: results.length,
    succeeded: results.filter((r)=>r.ok).length,
    failed: results.filter((r)=>!r.ok).length,
  });
  for (const r of results.filter(x=>!x.ok)) {
    console.error('[backfill] failed item', r);
  }
  process.exit(0);
}

main().catch((e)=> {
  console.error('[backfill] fatal', String(e && e.message ? e.message : e));
  process.exit(2);
});

