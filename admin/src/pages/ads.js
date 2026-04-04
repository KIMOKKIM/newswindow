import { apiFetch, authHeaders } from '../api/client.js';
import {
  getSession,
  requireRole,
  dashboardPathForRole,
} from '../auth/session.js';
import { renderShell, navAdmin, bindShell } from '../layout/shell.js';

function fileToBase64(file) {
  return new Promise((res) => {
    if (!file) {
      res('');
      return;
    }
    const r = new FileReader();
    r.onload = () => res(r.result || '');
    r.readAsDataURL(file);
  });
}

/** 메인 `index.html` / `styles.css` 기준 권장 사이즈 안내 */
const ADS_LAYOUT_INTRO =
  '메인 페이지 기준 배치입니다. 좌·우 세로 광고는 브라우저 너비 <strong>1400px 이상</strong>에서만 표시됩니다.';

function slotHtml(label, idBase, src, href, specLine) {
  const spec = specLine
    ? `<p class="nw-ads-slot-spec" aria-label="권장 이미지 크기">${escAttr(specLine)}</p>`
    : '';
  return `
    <div class="nw-ads-slot">
      <div class="nw-ads-slot-head">
        <h3 class="nw-ads-slot-title">${label}</h3>
        ${spec}
      </div>
      <div class="nw-ads-slot-fields">
        <div class="nw-ads-field">
          <label for="${idBase}_src">이미지 URL</label>
          <input type="text" id="${idBase}_src" value="${escAttr(src)}" />
          <input type="file" id="${idBase}_file" accept="image/*" class="nw-ads-file-input" />
          <span id="${idBase}_upMsg" class="nw-ads-upload-hint" aria-live="polite"></span>
        </div>
        <div class="nw-ads-field">
          <label for="${idBase}_href">클릭 시 이동 URL</label>
          <input type="text" id="${idBase}_href" value="${escAttr(href)}" placeholder="https://…" />
        </div>
      </div>
    </div>`;
}

function escAttr(s) {
  return String(s == null ? '' : s).replace(/"/g, '&quot;');
}

function isNewswindowHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h === 'www.newswindow.kr' || h === 'newswindow.kr' || h === 'localhost' || h === '127.0.0.1';
}

/** `#https://…` · `https://뉴스의창/#https://광고주/…` 등 보정 */
function normalizeAdHref(href) {
  let h = String(href == null ? '#' : href).trim();
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
    const u = new URL(h, `${typeof location !== 'undefined' ? location.origin : 'https://www.newswindow.kr'}/`);
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

function readPair(app, idBase) {
  const raw = app.querySelector('#' + idBase + '_href').value.trim() || '#';
  return {
    src: app.querySelector('#' + idBase + '_src').value.trim(),
    href: normalizeAdHref(raw),
  };
}

function setSectionMsg(el, text, kind) {
  if (!el) return;
  el.textContent = text || '';
  el.className = 'nw-ads-section-msg' + (text && kind ? ' on ' + kind : '');
}

async function uploadBind(app, session, idBase, msgEl) {
  const fi = app.querySelector('#' + idBase + '_file');
  if (!fi) return;
  fi.addEventListener('change', async () => {
    const file = fi.files && fi.files[0];
    if (!file) {
      msgEl.textContent = '';
      return;
    }
    msgEl.textContent = '업로드 중…';
    try {
      const image = await fileToBase64(file);
      const { res, data } = await apiFetch('/api/ads/upload', {
        method: 'POST',
        headers: authHeaders(session.token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image, filename: file.name }),
      });
      if (res.status === 401) {
        alert('세션이 만료되었습니다.');
        return;
      }
      if (!res.ok) throw new Error((data && data.error) || '실패');
      app.querySelector('#' + idBase + '_src').value = data.url || '';
      msgEl.textContent = '업로드 완료';
    } catch (e) {
      msgEl.textContent = e.message || '오류';
    }
    fi.value = '';
  });
}

function renderFooterRowsHtml(footer) {
  const rows = Array.isArray(footer) ? footer : [];
  return rows
    .map(
      (f, i) => `
    <div class="nw-ads-footer-row" data-fi="${i}">
      <input type="text" data-k="image" placeholder="이미지 URL (롤링 권장 175×71, 250×101의 70%)" value="${escAttr(f.image || f.src || '')}" />
      <input type="text" data-k="alt" placeholder="대체 텍스트" value="${escAttr(f.alt || '')}" />
      <input type="text" data-k="href" placeholder="https://…" value="${escAttr(f.href || '#')}" />
      <div class="nw-ads-footer-actions">
        <input type="file" data-footer-upload="${i}" accept="image/*" class="nw-ads-file-input" />
        <button type="button" class="nw-btn-sm nw-danger" data-rm-footer="${i}">삭제</button>
      </div>
    </div>`
    )
    .join('');
}

export async function renderAds(app, { navigate }) {
  const session = getSession();
  if (!requireRole(session, 'admin')) {
    alert('관리자만 접근할 수 있습니다.');
    navigate(dashboardPathForRole(session.role));
    return;
  }

  const { res, data } = await apiFetch('/api/ads');
  if (!res.ok) {
    app.innerHTML = `<div class="nw-login-wrap"><p class="nw-error">광고 설정을 불러오지 못했습니다.</p></div>`;
    return;
  }

  const ads = data || {};
  const hl = ads.headerLeft || {};
  const hr = ads.headerRight || {};
  const sl = Array.isArray(ads.sideLeftStack) ? ads.sideLeftStack : [];
  const sr = Array.isArray(ads.sideRightStack) ? ads.sideRightStack : [];
  while (sl.length < 4) sl.push({ src: '', href: '#' });
  while (sr.length < 3) sr.push({ src: '', href: '#' });
  let footer = Array.isArray(ads.footer) ? ads.footer.map((x) => ({ ...x })) : [];

  const leftSpecs = [
    '메인 좌측 ① 상단 · 가로형 카드 · 권장 약 250×101 px (세로 스택 첫 칸, 이미지 contain)',
    '메인 좌측 ② · 가로형 · 권장 약 250×101 px',
    '메인 좌측 ③ · 가로형 · 권장 약 250×101 px',
    '메인 좌측 ④ 하단 · 세로형 카드 · 권장 세로가 더 긴 비율(약 3:4), 데스크톱에서 높이 가변',
  ];
  let leftStacks = '';
  for (let i = 0; i < 4; i++) {
    const x = sl[i] || { src: '', href: '#' };
    leftStacks += slotHtml(`좌측 사이드 ${i + 1}번`, 'sl' + i, x.src, x.href, leftSpecs[i]);
  }

  const rightSpecs = [
    '메인 우측 ① · 스카이(높은 배너) · 슬롯 높이 약 400px · 가로 폭 약 250px (세로형 소재 권장)',
    '메인 우측 ② · 짧은 가로 배너 · 권장 약 250×90 px',
    '메인 우측 ③ · 짧은 가로 배너 · 권장 약 250×90 px',
  ];
  let rightStacks = '';
  for (let i = 0; i < 3; i++) {
    const x = sr[i] || { src: '', href: '#' };
    rightStacks += slotHtml(`우측 사이드 ${i + 1}번`, 'sr' + i, x.src, x.href, rightSpecs[i]);
  }

  const body = `
    <p class="nw-ads-map-intro">${ADS_LAYOUT_INTRO}</p>

    <div class="nw-ads-section nw-ads-section--placement">
      <h2 class="nw-ads-placement-h">① 상단 로고 라인 — 좌·우 제휴 배너</h2>
      <p class="nw-ads-placement-desc">메인 헤더 상단, 로고 양옆 직사각 배너 자리입니다.</p>
      <div class="nw-ads-slot-pair">
        ${slotHtml(
          '헤더 좌측 배너',
          'hdrL',
          hl.src,
          hl.href,
          '권장 250 × 101 px (가로형, 헤더 partner-banner-img와 동일 비율)'
        )}
        ${slotHtml(
          '헤더 우측 배너',
          'hdrR',
          hr.src,
          hr.href,
          '권장 250 × 101 px (가로형)'
        )}
      </div>
      <div class="nw-ads-section-foot">
        <button type="button" class="nw-btn nw-btn-primary" id="adsSaveHeader">① 이 영역 저장</button>
        <p id="adsSaveMsgHeader" class="nw-ads-section-msg" role="status"></p>
      </div>
    </div>

    <div class="nw-ads-section nw-ads-section--placement">
      <h2 class="nw-ads-placement-h">② 본문 왼쪽 세로 스택 (4단)</h2>
      <p class="nw-ads-placement-desc">데스크톱에서 본문(중앙 칼럼) 왼쪽에 세로로 쌓이는 광고입니다. 위에서부터 1→4 순서입니다.</p>
      <div class="nw-ads-slots-stack">
        ${leftStacks}
      </div>
      <div class="nw-ads-section-foot">
        <button type="button" class="nw-btn nw-btn-primary" id="adsSaveLeft">② 이 영역 저장</button>
        <p id="adsSaveMsgLeft" class="nw-ads-section-msg" role="status"></p>
      </div>
    </div>

    <div class="nw-ads-section nw-ads-section--placement">
      <h2 class="nw-ads-placement-h">③ 본문 오른쪽 세로 스택 (3단)</h2>
      <p class="nw-ads-placement-desc">본문 오른쪽 열입니다. ①은 높은 스카이형, ②·③은 낮은 가로 슬롯입니다.</p>
      <div class="nw-ads-slots-stack">
        ${rightStacks}
      </div>
      <div class="nw-ads-section-foot">
        <button type="button" class="nw-btn nw-btn-primary" id="adsSaveRight">③ 이 영역 저장</button>
        <p id="adsSaveMsgRight" class="nw-ads-section-msg" role="status"></p>
      </div>
    </div>

    <div class="nw-ads-section nw-ads-section--placement">
      <h2 class="nw-ads-placement-h">④ 푸터 상단 — 가로 롤링 스폰서</h2>
      <p class="nw-ads-placement-desc">회사 정보 바로 위, 가로로 흐르는 배너 띠입니다. 노출 영역은 헤더 배너보다 작게(약 70%) 잡혀 있습니다.</p>
      <p class="nw-ads-footer-spec">롤링 배너 권장: 각 약 <strong>175 × 71 px</strong> (구 250×101의 <strong>70%</strong>, 동일 가로세로 비율)</p>
      <div id="adsFooterRows" class="nw-ads-footer-rows">${renderFooterRowsHtml(footer)}</div>
      <button type="button" class="nw-btn" id="adsAddFooter">+ 롤링 항목 추가</button>
      <div class="nw-ads-section-foot">
        <button type="button" class="nw-btn nw-btn-primary" id="adsSaveFooter">④ 이 영역 저장</button>
        <p id="adsSaveMsgFooter" class="nw-ads-section-msg" role="status"></p>
      </div>
    </div>`;

  app.innerHTML = renderShell({
    title: '광고 관리',
    activePath: '/admin/ads',
    navHtml: navAdmin('/admin/ads'),
    bodyHtml: body,
  });
  bindShell(app, { navigate });

  const SAVE_OK = '저장되었습니다. 메인 페이지 새로고침 후 반영됩니다.';

  async function putAdsSection(partial, msgEl) {
    setSectionMsg(msgEl, '', '');
    const { res, data } = await apiFetch('/api/ads', {
      method: 'PUT',
      headers: authHeaders(session.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(partial),
    });
    if (res.status === 401) {
      alert('세션이 만료되었습니다.');
      navigate('/admin/admin/login');
      return;
    }
    if (!res.ok) {
      setSectionMsg(msgEl, (data && data.error) || '저장 실패', 'err');
      return;
    }
    setSectionMsg(msgEl, SAVE_OK, 'ok');
  }

  for (const idBase of ['hdrL', 'hdrR']) {
    const hint = app.querySelector('#' + idBase + '_upMsg');
    if (hint) await uploadBind(app, session, idBase, hint);
  }
  for (let i = 0; i < 4; i++) {
    const hint = app.querySelector('#sl' + i + '_upMsg');
    if (hint) await uploadBind(app, session, 'sl' + i, hint);
  }
  for (let i = 0; i < 3; i++) {
    const hint = app.querySelector('#sr' + i + '_upMsg');
    if (hint) await uploadBind(app, session, 'sr' + i, hint);
  }

  function gatherFooter() {
    const out = [];
    app.querySelectorAll('.nw-ads-footer-row').forEach((row) => {
      const o = { image: '', alt: '', href: '#' };
      row.querySelectorAll('input[type="text"]').forEach((inp) => {
        const k = inp.getAttribute('data-k');
        if (k) o[k] = inp.value.trim();
      });
      if (!o.href) o.href = '#';
      o.href = normalizeAdHref(o.href);
      out.push(o);
    });
    return out;
  }

  function rebindFooterUploads() {
    app.querySelectorAll('[data-footer-upload]').forEach((inp) => {
      inp.replaceWith(inp.cloneNode(true));
    });
    app.querySelectorAll('[data-footer-upload]').forEach((inp) => {
      inp.addEventListener('change', async () => {
        const i = inp.getAttribute('data-footer-upload');
        const row = inp.closest('.nw-ads-footer-row');
        if (!row || !inp.files || !inp.files[0]) return;
        const urlInp = row.querySelector('input[data-k="image"]');
        try {
          const image = await fileToBase64(inp.files[0]);
          const { res, data } = await apiFetch('/api/ads/upload', {
            method: 'POST',
            headers: authHeaders(session.token, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ image, filename: inp.files[0].name }),
          });
          if (res.status === 401) {
            alert('세션이 만료되었습니다.');
            return;
          }
          if (!res.ok) throw new Error((data && data.error) || '실패');
          if (urlInp) urlInp.value = data.url || '';
        } catch (e) {
          alert(e.message || '업로드 실패');
        }
        inp.value = '';
      });
    });
    app.querySelectorAll('[data-rm-footer]').forEach((btn) => {
      btn.onclick = () => {
        btn.closest('.nw-ads-footer-row')?.remove();
      };
    });
  }

  rebindFooterUploads();

  app.querySelector('#adsAddFooter').addEventListener('click', () => {
    footer = gatherFooter();
    footer.push({ image: '', alt: '', href: '#' });
    app.querySelector('#adsFooterRows').innerHTML = renderFooterRowsHtml(footer);
    rebindFooterUploads();
    setSectionMsg(app.querySelector('#adsSaveMsgFooter'), '', '');
  });

  app.querySelector('#adsSaveHeader').addEventListener('click', () => {
    void putAdsSection(
      {
        headerLeft: readPair(app, 'hdrL'),
        headerRight: readPair(app, 'hdrR'),
      },
      app.querySelector('#adsSaveMsgHeader')
    );
  });

  app.querySelector('#adsSaveLeft').addEventListener('click', () => {
    const sideLeftStack = [];
    for (let i = 0; i < 4; i++) sideLeftStack.push(readPair(app, 'sl' + i));
    void putAdsSection({ sideLeftStack }, app.querySelector('#adsSaveMsgLeft'));
  });

  app.querySelector('#adsSaveRight').addEventListener('click', () => {
    const sideRightStack = [];
    for (let i = 0; i < 3; i++) sideRightStack.push(readPair(app, 'sr' + i));
    void putAdsSection({ sideRightStack }, app.querySelector('#adsSaveMsgRight'));
  });

  app.querySelector('#adsSaveFooter').addEventListener('click', () => {
    void putAdsSection({ footer: gatherFooter() }, app.querySelector('#adsSaveMsgFooter'));
  });
}
