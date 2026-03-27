import { articlesDb } from '../../../../backend/db/articles.js';

export default function handler(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: 'missing_id' });
    const row = articlesDb.findById(id, null);
    if (!row) return res.status(404).json({ error: 'not_found' });
    if ((row.status || '').toLowerCase() !== 'published') return res.status(403).json({ error: 'not_published' });
    const inc = String((req.headers['x-increment-view'] || '')).trim() === '1';
    if (inc) {
      articlesDb.incrementViewCount(id);
      const updated = articlesDb.findById(id, null);
      return res.status(200).json(updated || row);
    }
    res.status(200).json(row);
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: String(e && e.message) });
  }
}

