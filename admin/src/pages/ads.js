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

function slotHtml(label, idBase, src, href) {
  return `
    <div class="nw-ads-slot">
      <div class="nw-ads-field">
        <label>${label} — 이미지 URL</label>
        <input type="text" id="${idBase}_src" value="${escAttr(src)}" />
        <input type="file" id="${idBase}_file" accept="image/*" style="margin-top:6px;font-size:12px;" />
        <span id="${idBase}_upMsg" class="nw-ads-upload-hint" aria-live="polite"></span>
      </div>
      <div class="nw-ads-field">
        <label>링크</label>
        <input type="text" id="${idBase}_href" value="${escAttr(href)}" />
      </div>
    </div>`;
}

function escAttr(s) {
  return String(s == null ? '' : s).replace(/"/g, '&quot;');
}

function readPair(app, idBase) {
  return {
    src: app.querySelector('#' + idBase + '_src').value.trim(),
    href: app.querySelector('#' + idBase + '_href').value.trim() || '#',
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
      <input type="text" data-k="image" placeholder="이미지 URL" value="${escAttr(f.image || f.src || '')}" />
      <input type="text" data-k="alt" placeholder="alt" value="${escAttr(f.alt || '')}" />
      <input type="text" data-k="href" placeholder="링크" value="${escAttr(f.href || '#')}" />
      <div>
        <input type="file" data-footer-upload="${i}" accept="image/*" style="font-size:12px;" />
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

  let leftStacks = '';
  for (let i = 0; i < 4; i++) {
    const x = sl[i] || { src: '', href: '#' };
    leftStacks += slotHtml('좌측 스택 ' + (i + 1), 'sl' + i, x.src, x.href);
  }
  let rightStacks = '';
  for (let i = 0; i < 3; i++) {
    const x = sr[i] || { src: '', href: '#' };
    rightStacks += slotHtml('우측 스택 ' + (i + 1), 'sr' + i, x.src, x.href);
  }

  const body = `
    <div class="nw-ads-section">
      <h2>헤더 좌·우</h2>
      ${slotHtml('헤더 좌측', 'hdrL', hl.src, hl.href)}
      ${slotHtml('헤더 우측', 'hdrR', hr.src, hr.href)}
      <div class="nw-ads-section-foot">
        <button type="button" class="nw-btn nw-btn-primary" id="adsSaveHeader">이 섹션 저장</button>
        <p id="adsSaveMsgHeader" class="nw-ads-section-msg" role="status"></p>
      </div>
    </div>

    <div class="nw-ads-section">
      <h2>좌측 세로 스택 (4칸)</h2>
      ${leftStacks}
      <div class="nw-ads-section-foot">
        <button type="button" class="nw-btn nw-btn-primary" id="adsSaveLeft">이 섹션 저장</button>
        <p id="adsSaveMsgLeft" class="nw-ads-section-msg" role="status"></p>
      </div>
    </div>

    <div class="nw-ads-section">
      <h2>우측 세로 스택 (3칸)</h2>
      ${rightStacks}
      <div class="nw-ads-section-foot">
        <button type="button" class="nw-btn nw-btn-primary" id="adsSaveRight">이 섹션 저장</button>
        <p id="adsSaveMsgRight" class="nw-ads-section-msg" role="status"></p>
      </div>
    </div>

    <div class="nw-ads-section">
      <h2>푸터 롤링 배너</h2>
      <div id="adsFooterRows">${renderFooterRowsHtml(footer)}</div>
      <button type="button" class="nw-btn" id="adsAddFooter">+ 항목 추가</button>
      <div class="nw-ads-section-foot">
        <button type="button" class="nw-btn nw-btn-primary" id="adsSaveFooter">이 섹션 저장</button>
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
