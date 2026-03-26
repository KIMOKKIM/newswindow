import { Router } from 'express';
import crypto from 'crypto';

export const spellCheckRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

/** 본문 3단 구분용 (입력에 포함될 가능성 낮음) */
export const BODY_SECTION_DELIM = '\n<<<NW_BODY_SPLIT>>>\n';

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

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: '인증 필요' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: '토큰 만료 또는 유효하지 않음' });
  req.user = user;
  next();
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 샘플 교정: 공백·줄바꿈 정리 + 자주 틀리는 표기 몇 가지.
 * 실제 서비스에서는 한국어 맞춤법 API(부산대 등)로 교체하면 됩니다.
 */
function applySampleCorrections(text) {
  if (text == null || text === '') return '';
  let t = String(text);
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/[ \t]+\n/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  const rules = [
    [/맞추법/g, '맞춤법'],
    [/맞추어/g, '맞추어'], // keep - actually '맞혀' contexts differ; sample:
    [/되요\b/g, '돼요'],
    [/안되요\b/g, '안 돼요'],
    [/않되는/g, '안 되는'],
    [/않된다/g, '안 된다'],
    [/됬다/g, '됐다'],
    [/됬어/g, '됐어'],
    [/해주세요/g, '해 주세요'],
    [/해주시면/g, '해 주시면'],
    [/어떻해/g, '어떻게'],
    [/금새\b/g, '금세'],
    [/역활/g, '역할'],
    [/설겆이/g, '설거지'],
    [/곰곰히/g, '곰곰이'],
    [/내노라하/g, '내로라하'],
    [/여간히/g, '여간히'],
    [/곧데로/g, '고대로']
  ];
  for (const [re, rep] of rules) {
    t = t.replace(re, rep);
  }
  t = t.split('\n').map((line) => line.replace(/[ \t]{2,}/g, ' ').trimEnd()).join('\n');
  return t.trim();
}

/**
 * 교정문에서 원문 대비 달라진 연속 구간을 적색 표시 (단일 블록 근사)
 */
function correctedHighlightHtml(original, corrected) {
  const o = original ?? '';
  const c = corrected ?? '';
  if (o === c) return escapeHtml(c);
  let pre = 0;
  const L = Math.min(o.length, c.length);
  while (pre < L && o[pre] === c[pre]) pre++;
  let suf = 0;
  while (
    suf < o.length - pre &&
    suf < c.length - pre &&
    o[o.length - 1 - suf] === c[c.length - 1 - suf]
  ) {
    suf++;
  }
  const mid = c.slice(pre, c.length - suf);
  return (
    escapeHtml(c.slice(0, pre)) +
    '<span class="spell-changed">' +
    escapeHtml(mid) +
    '</span>' +
    escapeHtml(c.slice(c.length - suf))
  );
}

function buildFieldResult(original, corrected) {
  const orig = original == null ? '' : String(original);
  const corr = corrected == null ? '' : String(corrected);
  const changed = orig !== corr;
  return {
    original: orig,
    corrected: corr,
    changed,
    html: correctedHighlightHtml(orig, corr)
  };
}

spellCheckRouter.post('/article', authMiddleware, (req, res) => {
  const role = (req.user?.role || '').trim().toLowerCase();
  if (role !== 'reporter' && role !== 'admin' && role !== 'editor_in_chief') {
    return res.status(403).json({ error: '기사 작성 권한이 필요합니다.' });
  }

  const { title = '', subtitle = '', body = '' } = req.body || {};
  const t0 = typeof title === 'string' ? title : '';
  const s0 = typeof subtitle === 'string' ? subtitle : '';
  const b0 = typeof body === 'string' ? body : '';

  if (!t0.trim() && !s0.trim() && !b0.trim()) {
    return res.status(400).json({
      error: '검사할 내용이 없습니다. 제목·부제목·본문 중 하나 이상 입력해 주세요.'
    });
  }

  const titleOut = buildFieldResult(t0, applySampleCorrections(t0));
  const subtitleOut = buildFieldResult(s0, applySampleCorrections(s0));

  const hasSplit = b0.includes(BODY_SECTION_DELIM);
  const parts = hasSplit ? b0.split(BODY_SECTION_DELIM) : [b0];
  const padParts = [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
  const correctedParts = padParts.map((p) => applySampleCorrections(p));
  const bodyJoinedOriginal = hasSplit ? padParts.join(BODY_SECTION_DELIM) : (padParts[0] ?? '');
  const bodyJoinedCorrected = hasSplit
    ? correctedParts.join(BODY_SECTION_DELIM)
    : (correctedParts[0] ?? '');
  const bodyOut = buildFieldResult(bodyJoinedOriginal, bodyJoinedCorrected);

  bodyOut.html = correctedParts
    .map((corr, i) => {
      const label = '내용 ' + (i + 1);
      const orig = padParts[i] ?? '';
      const inner = correctedHighlightHtml(orig, corr);
      return `<div class="spell-body-block"><strong class="spell-body-label">${label}</strong><div class="spell-corrected-html">${inner}</div></div>`;
    })
    .join('');

  res.json({
    title: {
      original: titleOut.original,
      corrected: titleOut.corrected,
      changed: titleOut.changed,
      html: titleOut.html
    },
    subtitle: {
      original: subtitleOut.original,
      corrected: subtitleOut.corrected,
      changed: subtitleOut.changed,
      html: subtitleOut.html
    },
    body: {
      original: bodyOut.original,
      corrected: bodyOut.corrected,
      changed: bodyOut.changed,
      html: bodyOut.html,
      partsCorrected: correctedParts
    }
  });
});
