import { articlesDb } from '../../../backend/db/articles.js';

export default function handler(req, res) {
  try {
    const list = articlesDb.publishedPublicList() || [];
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(list);
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: String(e && e.message) });
  }
}

