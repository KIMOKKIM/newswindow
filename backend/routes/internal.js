import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { assertSupabase } from '../lib/supabaseServer.js';
import { parseDataUri, uploadDataUriToStorage } from '../db/articles.supabase.js';

export const internalRouter = Router();

function hasDataUri(s) {
  return s && typeof s === 'string' && s.indexOf('data:') === 0;
}

/**
 * Backfill endpoint (ADMIN ONLY).
 * This route is gated by:
 *  - authMiddleware (must be admin/editor)
 *  - environment variable NW_ENABLE_INTERNAL_BACKFILL=true|1 (must be explicitly enabled)
 *
 * Keep this route protected in production. If you prefer, set NW_ENABLE_INTERNAL_BACKFILL to "0" or unset it.
 */
internalRouter.post('/backfill-upload-images', authMiddleware, async (req, res) => {
  // feature flag: require explicit ENV enablement to run backfill
  const enabled = String(process.env.NW_ENABLE_INTERNAL_BACKFILL || '').toLowerCase();
  if (!(enabled === '1' || enabled === 'true')) {
    // hide the existence of the route when not enabled
    return res.status(404).json({ error: 'Not found' });
  }
  // only allow admin/editor roles
  const role = req.user && req.user.role ? String(req.user.role).toLowerCase() : '';
  if (!['admin', 'editor_in_chief'].includes(role)) {
    return res.status(403).json({ error: '권한이 없습니다.' });
  }
  try {
    const client = assertSupabase();
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
        return res.status(500).json({ error: 'list query error', detail: String(error) });
      }
      if (!data || data.length === 0) break;
      for (const row of data) {
        const updates = {};
        for (const n of [1,2,3,4]) {
          const k = 'image' + n;
          const val = row[k];
          if (hasDataUri(val)) {
            const uploaded = await uploadDataUriToStorage(val, `article${row.id}-${k}`);
            if (uploaded) {
              updates[k] = uploaded;
            } else {
              results.push({ id: row.id, ok: false, reason: `upload_failed:${k}` });
            }
          }
        }
        if (Object.keys(updates).length > 0) {
          const { data: udata, error: uerr } = await client.from('articles').update(updates).eq('id', row.id).select('id,image1,image2,image3,image4').single();
          if (uerr) {
            results.push({ id: row.id, ok: false, reason: 'db_update_failed', detail: String(uerr) });
          } else {
            results.push({ id: row.id, ok: true, updated: udata });
          }
        }
      }
      if (data.length < pageSize) break;
      from += pageSize;
    }
    const succ = results.filter((r) => r.ok).length;
    const fail = results.length - succ;
    return res.json({ totalFound: results.length, succeeded: succ, failed: fail, items: results.slice(0, 200) });
  } catch (e) {
    return res.status(500).json({ error: 'internal', detail: String(e && e.message ? e.message : e) });
  }
});

