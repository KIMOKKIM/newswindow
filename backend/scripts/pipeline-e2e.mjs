/**
 * E2E: 기자 POST draft → GET 목록 → PATCH submitted → 편집장 approve → public/list
 * 인증: users.json 비밀번호 미문서화로 로그인 API 대신 JWT_SECRET 일치 토큰 발급 (실백엔드와 동일 검증 플로우).
 */
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const ARTICLES_PATH = path.join(DATA_DIR, 'articles.json');

const BASE = process.env.E2E_API || 'http://127.0.0.1:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const PREFIX = `[TEST_PIPELINE_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}]`;

/** 기자 id 10 = gimkimok_reporter (기존 데이터와 동일 스토어, 신규 행만 추가) */
const REPORTER = { id: 10, userid: 'gimkimok_reporter', role: 'reporter', name: 'E2E테스트기자' };
const EDITOR = { id: 1, userid: 'teomok1', role: 'editor_in_chief', name: 'E2E편집장' };

function token(user) {
  return jwt.sign({ id: user.id, userid: user.userid, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '2h' });
}

async function http(method, url, body, auth) {
  const opts = { method, headers: { Accept: 'application/json' } };
  if (auth) opts.headers.Authorization = 'Bearer ' + auth;
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    json = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, json, url };
}

const evidence = { prefix: PREFIX, base: BASE, articlesPath: ARTICLES_PATH, steps: [] };
const testIds = [];

function log(step, data) {
  evidence.steps.push({ step, ...data });
  console.log(JSON.stringify({ step, ...data }, null, 0));
}

console.log('ARTICLES_PATH=', ARTICLES_PATH);
console.log('PREFIX=', PREFIX);

const rt = token(REPORTER);
const et = token(EDITOR);

// ---- Create 5 drafts ----
for (let i = 1; i <= 5; i++) {
  const title = `${PREFIX} 기사 ${i}`;
  const subtitle = `부제 E2E-${i}`;
  const content1 = `본문 구분용 E2E 파이프라인 기사 ${i} / ${PREFIX} / draft 저장`;
  const r = await http(
    'POST',
    `${BASE}/articles`,
    { title, subtitle, category: 'E2E', content1, content2: '', content3: '', status: 'draft' },
    rt
  );
  log('POST_draft', {
    i,
    url: r.url,
    status: r.status,
    id: r.json?.id,
    title: r.json?.title,
    apiStatus: r.json?.status,
  });
  if (r.status === 201 && r.json?.id != null) testIds.push(r.json.id);
  else {
    console.error('draft failed', r);
    process.exit(1);
  }
}

// ---- Reporter list ----
let rList = await http('GET', `${BASE}/articles`, undefined, rt);
log('GET_reporter_list_after_save', {
  url: rList.url,
  status: rList.status,
  total: Array.isArray(rList.json) ? rList.json.length : null,
  testRowsInList: Array.isArray(rList.json)
    ? rList.json.filter((a) => testIds.includes(a.id)).map((a) => ({ id: a.id, title: (a.title || '').slice(0, 60), status: a.status }))
    : [],
});

// ---- Submit each ----
for (const id of testIds) {
  const r = await http(
    'PATCH',
    `${BASE}/articles/${id}`,
    { status: 'pending', title: `${PREFIX} 기사 ${testIds.indexOf(id) + 1}` },
    rt
  );
  log('PATCH_submit', {
    id,
    url: r.url,
    status: r.status,
    message: r.json?.message,
    article: r.json && r.json.article && typeof r.json.article === 'object' && r.json.article.id != null
      ? { id: r.json.article.id, status: r.json.article.status, submitted_at: r.json.article.submitted_at }
      : { _note: 'see full json', keys: r.json ? Object.keys(r.json) : [] },
  });
}

rList = await http('GET', `${BASE}/articles`, undefined, rt);
log('GET_reporter_after_submit', {
  status: rList.status,
  testStatuses: testIds.map((id) => {
    const a = Array.isArray(rList.json) ? rList.json.find((x) => x.id === id) : null;
    return a ? { id, status: a.status, submitted_at: a.submitted_at } : { id, missing: true };
  }),
});

// ---- Editor list ----
let eList = await http('GET', `${BASE}/articles`, undefined, et);
log('GET_editor_after_submit', {
  status: eList.status,
  total: Array.isArray(eList.json) ? eList.json.length : null,
  testInEditor: testIds.map((id) => {
    const a = Array.isArray(eList.json) ? eList.json.find((x) => x.id === id) : null;
    return a ? { id, title: (a.title || '').slice(0, 50), status: a.status } : { id, missing: true };
  }),
});

// ---- GET detail each (editor) ----
for (const id of testIds) {
  const r = await http('GET', `${BASE}/articles/${id}`, undefined, et);
  log('GET_detail_editor', { id, status: r.status, title: r.json?.title, apiStatus: r.json?.status });
}

// ---- Approve each ----
for (const id of testIds) {
  const r = await http('PATCH', `${BASE}/articles/${id}`, { action: 'approve' }, et);
  log('PATCH_approve', {
    id,
    status: r.status,
    message: r.json?.message,
    article:
      r.json && r.json.article && typeof r.json.article === 'object' && r.json.article.id != null
        ? {
            id: r.json.article.id,
            status: r.json.article.status,
            published_at: r.json.article.published_at,
          }
        : { keys: r.json ? Object.keys(r.json) : [] },
  });
}

// ---- Public list ----
const pub = await http('GET', `${BASE}/articles/public/list`, undefined, undefined);
const pubTitles = Array.isArray(pub.json) ? pub.json.map((a) => ({ id: a.id, title: (a.title || '').slice(0, 80) })) : [];
const testOnMain = testIds.map((id) => {
  const row = Array.isArray(pub.json) ? pub.json.find((a) => a.id === id) : null;
  return row ? { id, title: (row.title || '').slice(0, 60), inMainApi: true } : { id, inMainApi: false };
});
log('GET_public_list', {
  url: pub.url,
  status: pub.status,
  totalPublished: Array.isArray(pub.json) ? pub.json.length : null,
  testOnMain,
  firstEntries: pubTitles.slice(0, 8),
});

// ---- Verify draft-only (none should stay non-published for our ids) ----
const nonPub = testIds.filter((id) => !testOnMain.find((x) => x.id === id)?.inMainApi);
log('summary', {
  testIds,
  created: testIds.length,
  allOnMainApi: nonPub.length === 0,
  missingFromMain: nonPub,
});

fs.writeFileSync(path.join(__dirname, '..', '..', 'PIPELINE_E2E_EVIDENCE.json'), JSON.stringify(evidence, null, 2), 'utf8');
console.log('Wrote PIPELINE_E2E_EVIDENCE.json');
console.log('TEST_IDS_FOR_CLEANUP=', testIds.join(','));
