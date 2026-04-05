import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middleware/auth.js';

export const adsRouter = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
/** 운영에서 영구 디스크를 붙인 경로(예: Render Disk). 미설정 시 기본 backend/data/ads.json(재배포 시 리포/이미지와 함께 초기화될 수 있음). */
const adsPath = process.env.NW_ADS_JSON_PATH
  ? path.resolve(process.env.NW_ADS_JSON_PATH)
  : path.join(dataDir, 'ads.json');
const uploadsAdsDir = path.join(__dirname, '..', 'uploads', 'ads');

function loadAds() {
  if (!fs.existsSync(adsPath)) return normalizeAdsResponse(getDefaultAds());
  try {
    const data = JSON.parse(fs.readFileSync(adsPath, 'utf8'));
    return normalizeAdsResponse({ ...getDefaultAds(), ...data });
  } catch {
    return normalizeAdsResponse(getDefaultAds());
  }
}

function emptySideStacks() {
  return {
    sideLeftStack: [
      { src: '', href: '#' },
      { src: '', href: '#' },
      { src: '', href: '#' },
      { src: '', href: '#' }
    ],
    sideRightStack: [
      { src: '', href: '#' },
      { src: '', href: '#' },
      { src: '', href: '#' }
    ]
  };
}

function getDefaultAds() {
  return {
    headerLeft: { src: '', href: '#' },
    headerRight: { src: '', href: '#' },
    sideLeft: { src: '', href: '#' },
    sideRight: { src: '', href: '#' },
    ...emptySideStacks(),
    footer: []
  };
}

function isNewswindowHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h === 'www.newswindow.kr' || h === 'newswindow.kr' || h === 'localhost' || h === '127.0.0.1';
}

/**
 * `#https://…` 와 `https://뉴스의창/#https://광고주/#앵커` 등 잘못된 저장 형태를 광고주 URL로 고침.
 */
function normalizeAdHref(href) {
  let h = String(href ?? '#').trim();
  if (!h || h === '#') return '#';
  if (h.startsWith('#')) {
    const rest = h.slice(1).trim();
    if (/^https?:\/\//i.test(rest)) return normalizeAdHref(rest);
    if (rest.startsWith('//')) return normalizeAdHref(`https:${rest}`);
    return h;
  }
  try {
    const u = new URL(h);
    if (isNewswindowHost(u.hostname) && u.hash && u.hash.length > 1) {
      const inner = u.hash.slice(1).trim();
      if (/^https?:\/\//i.test(inner)) return normalizeAdHref(inner);
      if (inner.startsWith('//')) return normalizeAdHref(`https:${inner}`);
    }
  } catch {
    /* ignore */
  }
  try {
    const u = new URL(h, 'https://www.newswindow.kr/');
    if (isNewswindowHost(u.hostname) && u.hash && u.hash.length > 1) {
      const inner = u.hash.slice(1).trim();
      if (/^https?:\/\//i.test(inner)) return normalizeAdHref(inner);
      if (inner.startsWith('//')) return normalizeAdHref(`https:${inner}`);
    }
  } catch {
    /* ignore */
  }
  return h;
}

/** API 응답용: 스택 길이 보정 + 기존 sideLeft/sideRight를 1번 칸과 병합 */
function normalizeAdsResponse(data) {
  const base = { ...getDefaultAds(), ...data };
  const L = Array.isArray(base.sideLeftStack) ? base.sideLeftStack.slice(0, 4) : [];
  while (L.length < 4) L.push({ src: '', href: '#' });
  if (base.sideLeft && String(base.sideLeft.src || '').trim() && !String(L[0].src || '').trim()) {
    L[0] = { src: base.sideLeft.src, href: base.sideLeft.href || '#' };
  }
  base.sideLeftStack = L.map((x) => ({
    src: x.src || '',
    href: normalizeAdHref(x.href || '#')
  }));
  const R = Array.isArray(base.sideRightStack) ? base.sideRightStack.slice(0, 3) : [];
  while (R.length < 3) R.push({ src: '', href: '#' });
  if (base.sideRight && String(base.sideRight.src || '').trim() && !String(R[0].src || '').trim()) {
    R[0] = { src: base.sideRight.src, href: base.sideRight.href || '#' };
  }
  base.sideRightStack = R.map((x) => ({
    src: x.src || '',
    href: normalizeAdHref(x.href || '#')
  }));
  base.headerLeft = {
    ...base.headerLeft,
    src: base.headerLeft.src || '',
    href: normalizeAdHref(base.headerLeft.href)
  };
  base.headerRight = {
    ...base.headerRight,
    src: base.headerRight.src || '',
    href: normalizeAdHref(base.headerRight.href)
  };
  base.sideLeft = {
    ...base.sideLeft,
    src: base.sideLeft.src || '',
    href: normalizeAdHref(base.sideLeft.href)
  };
  base.sideRight = {
    ...base.sideRight,
    src: base.sideRight.src || '',
    href: normalizeAdHref(base.sideRight.href)
  };
  if (Array.isArray(base.footer)) {
    base.footer = base.footer.map((x) => ({
      ...x,
      href: normalizeAdHref(x && x.href)
    }));
  }
  return base;
}

function saveAds(data) {
  const dir = path.dirname(adsPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(adsPath, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/ads — 메인 페이지용 광고 설정 (공개)
// 하단 footer만 등록한 경우에도 sideLeftStack에 푸터를 복사하지 않음(중복 노출 방지).
adsRouter.get('/', (req, res) => {
  res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.json(loadAds());
});

// PUT /api/ads — 관리자만 광고 설정 수정
adsRouter.put('/', authMiddleware, (req, res) => {
  const role = (req.user?.role || '').trim().toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ error: '관리자만 수정할 수 있습니다.' });
  }
  const body = req.body || {};
  const current = loadAds();
  if (body.headerLeft != null) current.headerLeft = { ...current.headerLeft, ...body.headerLeft };
  if (body.headerRight != null) current.headerRight = { ...current.headerRight, ...body.headerRight };
  if (body.sideLeft != null) current.sideLeft = { ...current.sideLeft, ...body.sideLeft };
  if (body.sideRight != null) current.sideRight = { ...current.sideRight, ...body.sideRight };
  if (Array.isArray(body.sideLeftStack)) {
    current.sideLeftStack = body.sideLeftStack.slice(0, 4).map((x) => ({
      src: (x && x.src) || '',
      href: (x && x.href) || '#'
    }));
    while (current.sideLeftStack.length < 4) current.sideLeftStack.push({ src: '', href: '#' });
  }
  if (Array.isArray(body.sideRightStack)) {
    current.sideRightStack = body.sideRightStack.slice(0, 3).map((x) => ({
      src: (x && x.src) || '',
      href: (x && x.href) || '#'
    }));
    while (current.sideRightStack.length < 3) current.sideRightStack.push({ src: '', href: '#' });
  }
  if (Array.isArray(body.footer)) current.footer = body.footer;
  const out = normalizeAdsResponse({ ...getDefaultAds(), ...current });
  saveAds(out);
  res.json(out);
});

// POST /api/ads/upload — 관리자만 광고 이미지 파일 업로드 (base64)
adsRouter.post('/upload', authMiddleware, (req, res) => {
  const role = (req.user?.role || '').trim().toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ error: '관리자만 업로드할 수 있습니다.' });
  }
  const { image, filename } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'image (base64) 필수가 필요합니다.' });
  }
  let buf;
  let ext = path.extname(filename || '') || '.png';
  if (!/^\.(png|jpe?g|gif|webp|svg)$/i.test(ext)) ext = '.png';
  const dataUri = image.match(/^data:image\/\w+;base64,(.+)$/);
  if (dataUri) {
    buf = Buffer.from(dataUri[1], 'base64');
    const mimeMatch = image.match(/^data:(image\/\w+);/);
    if (mimeMatch) {
      const mime = mimeMatch[1];
      if (mime === 'image/jpeg') ext = '.jpg';
      else if (mime === 'image/png') ext = '.png';
      else if (mime === 'image/gif') ext = '.gif';
      else if (mime === 'image/webp') ext = '.webp';
      else if (mime === 'image/svg+xml') ext = '.svg';
    }
  } else {
    buf = Buffer.from(image, 'base64');
  }
  if (!buf.length) return res.status(400).json({ error: '잘못된 이미지 데이터입니다.' });
  if (!fs.existsSync(uploadsAdsDir)) fs.mkdirSync(uploadsAdsDir, { recursive: true });
  const baseName = 'ad-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
  const filePath = path.join(uploadsAdsDir, baseName);
  fs.writeFileSync(filePath, buf);
  const rel = '/uploads/ads/' + baseName;
  /** 프로덕션: 메인이 Vercel이면 상대 경로 /uploads 는 원본 호스트에 없을 수 있음 → Render 등 공개 origin 설정 */
  const base = String(process.env.PUBLIC_UPLOAD_ORIGIN || process.env.BACKEND_PUBLIC_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const url = base ? base + rel : rel;
  res.json({ url });
});
