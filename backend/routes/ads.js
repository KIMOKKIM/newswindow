import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const adsRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
const dataDir = path.join(process.cwd(), 'data');
const adsPath = path.join(dataDir, 'ads.json');
const uploadsAdsDir = path.join(process.cwd(), 'uploads', 'ads');

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

/** API 응답용: 스택 길이 보정 + 기존 sideLeft/sideRight를 1번 칸과 병합 */
function normalizeAdsResponse(data) {
  const base = { ...getDefaultAds(), ...data };
  const L = Array.isArray(base.sideLeftStack) ? base.sideLeftStack.slice(0, 4) : [];
  while (L.length < 4) L.push({ src: '', href: '#' });
  if (base.sideLeft && String(base.sideLeft.src || '').trim() && !String(L[0].src || '').trim()) {
    L[0] = { src: base.sideLeft.src, href: base.sideLeft.href || '#' };
  }
  base.sideLeftStack = L.map((x) => ({ src: x.src || '', href: x.href || '#' }));
  const R = Array.isArray(base.sideRightStack) ? base.sideRightStack.slice(0, 3) : [];
  while (R.length < 3) R.push({ src: '', href: '#' });
  if (base.sideRight && String(base.sideRight.src || '').trim() && !String(R[0].src || '').trim()) {
    R[0] = { src: base.sideRight.src, href: base.sideRight.href || '#' };
  }
  base.sideRightStack = R.map((x) => ({ src: x.src || '', href: x.href || '#' }));
  return base;
}

function saveAds(data) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(adsPath, JSON.stringify(data, null, 2), 'utf8');
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: '인증 필요' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: '토큰 만료 또는 유효하지 않음' });
  req.user = user;
  next();
}

// GET /api/ads — 메인 페이지용 광고 설정 (공개)
adsRouter.get('/', (req, res) => {
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
  saveAds(current);
  res.json(normalizeAdsResponse(current));
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
  const baseUrl = req.protocol + '://' + (req.get('host') || '127.0.0.1:3001');
  const url = baseUrl + '/uploads/ads/' + baseName;
  res.json({ url });
});
