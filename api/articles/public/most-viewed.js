import { articlesDb } from '../../../../backend/db/articles.js';

export default function handler(req, res) {
  try {
    const days = Math.max(1, Number(req.query.days || 30));
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 5)));
    const now = new Date();
    const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    const list = (articlesDb.publishedPublicList() || [])
      .filter(a => {
        const d = a.created_at ? new Date(a.created_at) : null;
        if (!d || isNaN(d.getTime())) return false;
        return d.getTime() >= cutoff.getTime();
      })
      .sort((a, b) => {
        const va = typeof a.view_count === 'number' ? a.view_count : (a.view_count ? Number(a.view_count) : 0);
        const vb = typeof b.view_count === 'number' ? b.view_count : (b.view_count ? Number(b.view_count) : 0);
        if (vb !== va) return vb - va;
        return (new Date(b.created_at || 0)).getTime() - (new Date(a.created_at || 0)).getTime();
      })
      .slice(0, limit);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(list);
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: String(e && e.message) });
  }
}

