import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const articlesPath = path.join(dataDir, 'articles.json');

let articles = [];
if (fs.existsSync(articlesPath)) {
  try {
    articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
  } catch {}
}
if (!Array.isArray(articles)) articles = [];
// migration: ensure view_count exists and is integer
for (let i = 0; i < articles.length; i++) {
  if (articles[i].view_count == null) articles[i].view_count = 0;
  else articles[i].view_count = Number(articles[i].view_count) || 0;
}

function save() {
  fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2), 'utf8');
}

export const articlesDb = {
  all() {
    return [...articles].reverse().map(a => ({
      id: a.id,
      title: a.title || '',
      subtitle: a.subtitle || '',
      category: a.category || '',
      author_id: a.author_id,
      author_name: a.author_name || '',
      summary: a.summary || '',
      status: a.status || 'pending',
      created_at: a.created_at || '',
      view_count: typeof a.view_count === 'number' ? a.view_count : (a.view_count ? Number(a.view_count) : 0)
    }));
  },
  findByAuthor(authorId) {
    return articles.filter(a => a.author_id === Number(authorId)).reverse().map(a => ({
      id: a.id,
      title: a.title || '',
      subtitle: a.subtitle || '',
      author_name: a.author_name || '',
      category: a.category || '',
      content: a.content || '',
      content1: a.content1, content2: a.content2, content3: a.content3,
      image1: a.image1, image2: a.image2, image3: a.image3,
      summary: a.summary || '',
      status: a.status || 'pending',
      created_at: a.created_at || ''
    }));
  },
  insert(data) {
    const id = articles.length ? Math.max(...articles.map(a => a.id)) + 1 : 1;
    const allContent = [data.content1, data.content2, data.content3].filter(Boolean).join('\n');
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const rec = {
      id,
      title: data.title || '',
      subtitle: data.subtitle || '',
      author_id: data.authorId,
      author_name: data.authorName || '',
      category: data.category || '',
      content: data.content || allContent,
      content1: data.content1 || '', content2: data.content2 || '', content3: data.content3 || '',
      image1: data.image1 || '', image2: data.image2 || '', image3: data.image3 || '',
      image1_caption: data.image1_caption || '', image2_caption: data.image2_caption || '', image3_caption: data.image3_caption || '',
      summary: data.summary || allContent.slice(0, 200) || '',
      status: data.status || 'pending',
      created_at: now,
      updated_at: now,
      view_count: 0
    };
    articles.push(rec);
    save();
    return rec;
  },
  findById(id, authorId) {
    const a = articles.find(x => x.id === Number(id));
    if (!a) return null;
    if (authorId != null && a.author_id !== Number(authorId)) return null;
    return {
      id: a.id,
      title: a.title || '',
      subtitle: a.subtitle || '',
      author_name: a.author_name || '',
      category: a.category || '',
      content: a.content || '',
      content1: a.content1, content2: a.content2, content3: a.content3,
      image1: a.image1, image2: a.image2, image3: a.image3,
      image1_caption: a.image1_caption || '', image2_caption: a.image2_caption || '', image3_caption: a.image3_caption || '',
      status: a.status || 'pending',
      created_at: a.created_at || '',
      updated_at: a.updated_at || a.created_at || '',
      view_count: typeof a.view_count === 'number' ? a.view_count : (a.view_count ? Number(a.view_count) : 0)
    };
  },
  update(id, authorId, data) {
    const a = articles.find(x => x.id === Number(id) && x.author_id === Number(authorId));
    if (!a) return false;
    if (data.title !== undefined) a.title = data.title;
    if (data.subtitle !== undefined) a.subtitle = data.subtitle;
    if (data.category !== undefined) a.category = data.category;
    if (data.content !== undefined) a.content = data.content;
    if (data.content1 !== undefined) a.content1 = data.content1;
    if (data.content2 !== undefined) a.content2 = data.content2;
    if (data.content3 !== undefined) a.content3 = data.content3;
    if (data.image1 !== undefined) a.image1 = data.image1;
    if (data.image2 !== undefined) a.image2 = data.image2;
    if (data.image3 !== undefined) a.image3 = data.image3;
    if (data.image1_caption !== undefined) a.image1_caption = data.image1_caption;
    if (data.image2_caption !== undefined) a.image2_caption = data.image2_caption;
    if (data.image3_caption !== undefined) a.image3_caption = data.image3_caption;
    if (data.summary !== undefined) a.summary = data.summary;
    if (data.status !== undefined) a.status = data.status;
    a.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
    save();
    return true;
  },
  updateStatus(id, status) {
    const a = articles.find(x => x.id === Number(id));
    if (!a) return false;
    a.status = status;
    save();
    return true;
  },

  incrementViewCount(id) {
    const a = articles.find(x => x.id === Number(id));
    if (!a) return false;
    a.view_count = (typeof a.view_count === 'number' ? a.view_count : (a.view_count ? Number(a.view_count) : 0)) + 1;
    save();
    return true;
  },

  /** 메인 헤드라인 등 공개 목록용 (이미지 썸네일 포함) */
  publishedPublicList() {
    const normImg = (img) => {
      if (!img || !String(img).trim()) return '';
      const s = String(img).trim();
      if (s.startsWith('data:')) return s;
      return 'data:image/jpeg;base64,' + s;
    };
    return [...articles].reverse()
      .filter(a => (a.status || '').toLowerCase() === 'published')
      .map(a => ({
        id: a.id,
        title: a.title || '',
        subtitle: a.subtitle || '',
        category: a.category || '',
        author_name: a.author_name || '',
        created_at: a.created_at || '',
        thumb: normImg(a.image1 || a.image2 || a.image3 || ''),
        view_count: typeof a.view_count === 'number' ? a.view_count : (a.view_count ? Number(a.view_count) : 0)
      }));
  }
};
