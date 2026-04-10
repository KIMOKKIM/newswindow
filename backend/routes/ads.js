import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authMiddleware } from '../middleware/auth.js';
import { getUploadsRoot } from '../config/dataPaths.js';
import { useSupabasePersistence, getAdsReadSource, getAdsWriteSource } from '../lib/dbMode.js';
import { assertSupabase, getBannersBucket } from '../lib/supabaseServer.js';

export const adsRouter = Router();

const uploadsAdsDir = path.join(getUploadsRoot(), 'ads');

adsRouter.use((req, res, next) => {
  const _json = res.json.bind(res);
  res.json = (body) => {
    console.log(
      '[nw/ads]',
      JSON.stringify({
        method: req.method,
        path: req.originalUrl || req.url,
        op: req.method === 'GET' ? 'read' : 'write',
        adsReadSource: getAdsReadSource(),
        adsWriteSource: getAdsWriteSource(),
      }),
    );
    return _json(body);
  };
  next();
});

function emptySideStacks() {
  return {
    sideLeftStack: [
      { src: '', href: '#' },
      { src: '', href: '#' },
      { src: '', href: '#' },
      { src: '', href: '#' },
    ],
    sideRightStack: [
      { src: '', href: '#' },
      { src: '', href: '#' },
      { src: '', href: '#' },
    ],
  };
}

function getDefaultAds() {
  return {
    headerLeft: { src: '', href: '#' },
    headerRight: { src: '', href: '#' },
    sideLeft: { src: '', href: '#' },
    sideRight: { src: '', href: '#' },
    ...emptySideStacks(),
    footer: [],
  };
}

function isNewswindowHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h === 'www.newswindow.kr' || h === 'newswindow.kr' || h === 'localhost' || h === '127.0.0.1';
}

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

function normalizeAdsResponse(data) {
  const base = { ...getDefaultAds(), ...data };
  const L = Array.isArray(base.sideLeftStack) ? base.sideLeftStack.slice(0, 4) : [];
  while (L.length < 4) L.push({ src: '', href: '#' });
  if (
    base.sideLeft &&
    String(base.sideLeft.src || base.sideLeft.image || '').trim() &&
    !String((L[0] && (L[0].src || L[0].image)) || '').trim()
  ) {
    L[0] = { src: base.sideLeft.src || base.sideLeft.image || '', href: base.sideLeft.href || '#' };
  }
  base.sideLeftStack = L.map((x) => ({
    src: (x && (x.src || x.image)) || '',
    href: normalizeAdHref(x.href || '#'),
  }));
  const R = Array.isArray(base.sideRightStack) ? base.sideRightStack.slice(0, 3) : [];
  while (R.length < 3) R.push({ src: '', href: '#' });
  if (
    base.sideRight &&
    String(base.sideRight.src || base.sideRight.image || '').trim() &&
    !String((R[0] && (R[0].src || R[0].image)) || '').trim()
  ) {
    R[0] = { src: base.sideRight.src || base.sideRight.image || '', href: base.sideRight.href || '#' };
  }
  base.sideRightStack = R.map((x) => ({
    src: (x && (x.src || x.image)) || '',
    href: normalizeAdHref(x.href || '#'),
  }));
  base.headerLeft = {
    ...base.headerLeft,
    src: base.headerLeft.src || '',
    href: normalizeAdHref(base.headerLeft.href),
  };
  base.headerRight = {
    ...base.headerRight,
    src: base.headerRight.src || '',
    href: normalizeAdHref(base.headerRight.href),
  };
  base.sideLeft = {
    ...base.sideLeft,
    src: base.sideLeft.src || base.sideLeft.image || '',
    href: normalizeAdHref(base.sideLeft.href),
  };
  base.sideRight = {
    ...base.sideRight,
    src: base.sideRight.src || base.sideRight.image || '',
    href: normalizeAdHref(base.sideRight.href),
  };
  if (Array.isArray(base.footer)) {
    base.footer = base.footer.map((x) => ({
      ...x,
      href: normalizeAdHref(x && x.href),
    }));
  }
  return base;
}

async function loadAdsSupabase() {
  const sb = assertSupabase();
  const { data, error } = await sb.from('ad_site_config').select('config').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (!data) return normalizeAdsResponse(getDefaultAds());
  let cfg = data.config;
  if (cfg == null || cfg === '') return normalizeAdsResponse(getDefaultAds());
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      cfg = {};
    }
  }
  if (typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) cfg = {};
  return normalizeAdsResponse({ ...getDefaultAds(), ...cfg });
}

/** 메인 통합 API 등에서 `/api/ads` 와 동일 JSON 재사용 */
export async function loadPublicAdsConfig() {
  return loadAdsSupabase();
}

/** JSONB 저장용 순수 객체(plain data). undefined 제거, 직렬화 검증 */
function cloneConfigForStore(payload) {
  return JSON.parse(JSON.stringify(payload));
}

/**
 * Supabase 저장 시 /uploads/… 는 Render/로컬 전용 — Storage public URL 만 허용
 * (NW_ADS_ALLOW_LOCAL_PATHS_IN_SUPABASE=1 이면 스킵)
 */
function sanitizeAdSrcForSupabase(obj) {
  if (String(process.env.NW_ADS_ALLOW_LOCAL_PATHS_IN_SUPABASE || '').trim() === '1') return obj;
  const j = cloneConfigForStore(obj);
  function fixUrl(fieldName, u) {
    if (typeof u !== 'string') return u;
    const s = u.trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s) || s.startsWith('//')) return s;
    if (/^\/?uploads\//i.test(s)) {
      console.warn('[ads][supabase] removed local path from config (re-upload via admin):', fieldName, s.slice(0, 160));
      return '';
    }
    return s;
  }
  for (const k of ['headerLeft', 'headerRight', 'sideLeft', 'sideRight']) {
    if (j[k] && typeof j[k] === 'object') {
      j[k] = { ...j[k], src: fixUrl(`${k}.src`, j[k].src) };
    }
  }
  for (const arrKey of ['sideLeftStack', 'sideRightStack']) {
    if (Array.isArray(j[arrKey])) {
      j[arrKey] = j[arrKey].map((x, i) => ({
        ...(x && typeof x === 'object' ? x : {}),
        src: fixUrl(`${arrKey}[${i}].src`, x && x.src),
        href: (x && x.href) || '#',
      }));
    }
  }
  if (Array.isArray(j.footer)) {
    j.footer = j.footer.map((x, i) => ({
      ...(x && typeof x === 'object' ? x : {}),
      image: fixUrl(`footer[${i}].image`, x && x.image),
      src: fixUrl(`footer[${i}].src`, x && x.src),
    }));
  }
  return j;
}

function logAdsPersistSnapshot(label, configObj) {
  const json = JSON.stringify(configObj);
  const max = 20000;
  const snapshot = json.length > max ? json.slice(0, max) + '…[truncated]' : json;
  console.log(`[ads][persist] ${label} byteLen=${Buffer.byteLength(json, 'utf8')} snapshot=${snapshot}`);
}

async function saveAdsSupabase(payload) {
  const sb = assertSupabase();
  const rawClone = cloneConfigForStore(payload);
  const configToStore = sanitizeAdSrcForSupabase(rawClone);
  const updated_at = new Date().toISOString();
  logAdsPersistSnapshot('before_supabase_write', configToStore);

  const { data: existing, error: selErr } = await sb.from('ad_site_config').select('id').eq('id', 1).maybeSingle();
  if (selErr) throw selErr;

  const config = configToStore;
  console.log('최종 저장 데이터:', config);

  let row;
  let wErr;
  if (existing) {
    const q = await sb
      .from('ad_site_config')
      .update({ config: configToStore, updated_at })
      .eq('id', 1)
      .select('config')
      .maybeSingle();
    row = q.data;
    wErr = q.error;
  } else {
    const q = await sb
      .from('ad_site_config')
      .insert({ id: 1, config: configToStore, updated_at })
      .select('config')
      .maybeSingle();
    row = q.data;
    wErr = q.error;
  }
  if (wErr) throw wErr;
  const storedKeys = row && row.config && typeof row.config === 'object' && !Array.isArray(row.config) ? Object.keys(row.config) : [];
  console.log(
    '[ads][supabase] after_write',
    JSON.stringify({
      storedTopKeys: storedKeys,
      footerLen: Array.isArray(row && row.config && row.config.footer) ? row.config.footer.length : null,
      headerLeftSrcLen:
        row && row.config && row.config.headerLeft && row.config.headerLeft.src != null
          ? String(row.config.headerLeft.src).length
          : null,
    }),
  );
}

// GET /api/ads — 메인 페이지용 광고 설정 (공개)
adsRouter.get('/', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    res.json(await loadAdsSupabase());
  } catch (e) {
    next(e);
  }
});

// PUT /api/ads — 관리자만 광고 설정 수정
adsRouter.put('/', authMiddleware, async (req, res, next) => {
  try {
    const role = (req.user?.role || '').trim().toLowerCase();
    if (role !== 'admin') {
      return res.status(403).json({ error: '관리자만 수정할 수 있습니다.' });
    }
    console.log('[ads][PUT] express req.body:', req.body);
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const inboundKeys = Object.keys(body);
    console.log(
      '[ads][PUT] inbound',
      JSON.stringify({ inboundKeys, approxJsonChars: JSON.stringify(body).length }),
    );

    if (inboundKeys.length === 0) {
      return res.status(400).json({
        error: '요청 본문이 비어 있습니다. 광고 필드를 JSON으로 보내 주세요.',
      });
    }

    const current = await loadAdsSupabase();
    if (body.headerLeft != null) current.headerLeft = { ...current.headerLeft, ...body.headerLeft };
    if (body.headerRight != null) current.headerRight = { ...current.headerRight, ...body.headerRight };
    if (body.sideLeft != null) current.sideLeft = { ...current.sideLeft, ...body.sideLeft };
    if (body.sideRight != null) current.sideRight = { ...current.sideRight, ...body.sideRight };
    if (Array.isArray(body.sideLeftStack)) {
      current.sideLeftStack = body.sideLeftStack.slice(0, 4).map((x) => ({
        src: (x && x.src) || '',
        href: (x && x.href) || '#',
      }));
      while (current.sideLeftStack.length < 4) current.sideLeftStack.push({ src: '', href: '#' });
    }
    if (Array.isArray(body.sideRightStack)) {
      current.sideRightStack = body.sideRightStack.slice(0, 3).map((x) => ({
        src: (x && x.src) || '',
        href: (x && x.href) || '#',
      }));
      while (current.sideRightStack.length < 3) current.sideRightStack.push({ src: '', href: '#' });
    }
    if (Array.isArray(body.footer)) current.footer = body.footer;
    const out = normalizeAdsResponse({ ...getDefaultAds(), ...current });
    await saveAdsSupabase(out);
    res.json(out);
  } catch (e) {
    next(e);
  }
});

// POST /api/ads/upload — 관리자만 광고 이미지 (Supabase Storage 또는 로컬 디스크)
adsRouter.post('/upload', authMiddleware, async (req, res, next) => {
  try {
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
    let contentType = 'image/png';
    const dataUri = image.match(/^data:image\/\w+;base64,(.+)$/);
    if (dataUri) {
      buf = Buffer.from(dataUri[1], 'base64');
      const mimeMatch = image.match(/^data:(image\/\w+);/);
      if (mimeMatch) {
        contentType = mimeMatch[1];
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

    if (useSupabasePersistence()) {
      const sb = assertSupabase();
      const bucket = getBannersBucket();
      const objectPath = `ads/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
      const { error: upErr } = await sb.storage.from(bucket).upload(objectPath, buf, {
        contentType,
        upsert: true,
      });
      if (upErr) return res.status(500).json({ error: upErr.message || 'Storage 업로드 실패' });
      const { data: pub } = sb.storage.from(bucket).getPublicUrl(objectPath);
      const url = pub?.publicUrl || '';
      if (!url) return res.status(500).json({ error: '공개 URL 생성 실패' });
      console.log('[ads][upload] storage_public_url', JSON.stringify({ bucket, objectPath, url }));
      return res.json({ url });
    }

    if (!fs.existsSync(uploadsAdsDir)) fs.mkdirSync(uploadsAdsDir, { recursive: true });
    const baseName = 'ad-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
    const filePath = path.join(uploadsAdsDir, baseName);
    fs.writeFileSync(filePath, buf);
    const rel = '/uploads/ads/' + baseName;
    const base = String(process.env.PUBLIC_UPLOAD_ORIGIN || process.env.BACKEND_PUBLIC_URL || '')
      .trim()
      .replace(/\/+$/, '');
    const url = base ? base + rel : rel;
    res.json({ url });
  } catch (e) {
    next(e);
  }
});
