import { apiFetch, authHeaders } from '../api/client.js';
import { bumpMainArticleListCache } from '../lib/mainListSync.js';
import {
  getSession,
  requireRole,
  dashboardPathForRole,
  loginPathForRole,
} from '../auth/session.js';
import { renderShell, navReporter, navEditor, navAdmin, bindShell } from '../layout/shell.js';
import { categorySelectHtml } from '../data/categories.js';
import {
  categoryLabelForValue,
  reporterDisplayName,
  formatArticleMetaDateYmd,
} from '../../../shared/articleMetaFormat.js';

const NW_SAVE_SLOW_MSG =
  '\uc800\uc7a5 \ucc98\ub9ac \uc2dc\uac04\uc774 \uae38\uc5b4\uc9c0\uace0 \uc788\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.';

/** Optional Vite env (build-safe default if unset): VITE_SAVE_LONG_WAIT_MS */
function resolveSaveLongWaitMs() {
  try {
    const raw = import.meta.env?.VITE_SAVE_LONG_WAIT_MS;
    const n = raw != null && String(raw).trim() !== '' ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 500 && n <= 120_000) return Math.floor(n);
  } catch (_) {
    /* ignore */
  }
  return 4000;
}
const NW_SAVE_LONG_WAIT_MS = resolveSaveLongWaitMs();

/** Shown after NW_SAVE_LONG_WAIT_MS while save request is in flight */
const NW_FORM_LONG_WAIT_HINT =
  '\uc800\uc7a5 \uc694\uccad\uc774 \uc624\ub798 \uac78\ub9ac\uace0 \uc788\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc\ub9cc \uae30\ub2e4\ub824 \uc8fc\uc138\uc694. \uac19\uc740 \ubb38\uc81c\uac00 \ubc18\ubcf5\ub418\uba74 \ub124\ud2b8\uc6cc\ud06c\ub97c \ud655\uc778\ud574 \uc8fc\uc138\uc694.';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

function navFor(session, path) {
  if (session.role === 'reporter') return navReporter(path);
  if (session.role === 'admin') return navAdmin(path);
  return navEditor(path);
}

export async function renderArticleForm(app, { navigate, articleId }) {
  const session = getSession();
  const isNew = !articleId;
  // Allow admins and editors to create new articles as well as reporters.
  const allowed = isNew ? ['reporter', 'editor', 'admin'] : ['reporter', 'editor', 'admin'];
  if (!requireRole(session, allowed)) {
    alert('권한이 없습니다.');
    navigate(session ? dashboardPathForRole(session.role) : '/admin');
    return;
  }

  let article = null;
  if (!isNew) {
    const { res, data } = await apiFetch('/api/articles/' + articleId, {
      headers: authHeaders(session.token),
    });
    if (res.status === 401) {
      alert('세션이 만료되었습니다.');
      navigate(loginPathForRole(session.role));
      return;
    }
    if (res.status === 403) {
      alert('이 기사를 수정할 권한이 없습니다.');
      navigate(dashboardPathForRole(session.role));
      return;
    }
    if (res.status === 404) {
      alert('기사를 찾을 수 없습니다.');
      navigate(session.role === 'reporter' ? '/admin/reporter' : '/admin/admin');
      return;
    }
    if (Array.isArray(data)) {
      console.error('[articleForm] expected object, got array (check /api/articles proxy path)');
      alert('기사 정보를 불러오지 못했습니다.');
      navigate(session.role === 'reporter' ? '/admin/reporter' : '/admin/admin');
      return;
    }
    article = data.article ? data.article : data;
  }

  const cat = article ? article.category || '' : '';
  const path = dashboardPathForRole(session.role);

  // Determine initial coverImageKey to restore representative selection on form load.
  const initialCoverKey = (() => {
    if (!article || typeof article !== 'object') return '';
    let ck = article.coverImageKey || article.cover_image_key || '';
    if (!ck && article.primaryImage) {
      try {
        const pi = String(article.primaryImage || '').trim();
        if (pi) {
          for (const n of [1, 2, 3, 4]) {
            const v = article['image' + n];
            if (v && String(v).trim() === pi) {
              ck = 'image' + n;
              break;
            }
          }
        }
      } catch (_e) {}
    }
    return ck;
  })();

  const body = `
    <p><a href="${path}" data-link>← 목록</a></p>
    <form id="artForm" class="nw-card nw-article-form">
      <div class="nw-form-row">
        <label>제목 *</label>
        <input type="text" id="title" required value="${esc(article?.title || '')}" />
      </div>
      <div class="nw-form-row">
        <label>부제목</label>
        <textarea id="subtitle" rows="2">${esc(article?.subtitle || '')}</textarea>
      </div>
      <div class="nw-form-row">
        <label>기자명</label>
        <input type="text" id="authorName" readonly value="${esc(article?.author_name || session.name || '')}" />
      </div>
      <div class="nw-form-row">
        <label>카테고리</label>
        <select id="category">${categorySelectHtml(cat)}</select>
      </div>
      <div class="nw-form-row">
        <label>본문 1</label>
        <textarea id="c1" rows="5">${esc(article?.content1 || '')}</textarea>
      </div>
      <div class="nw-form-row">
        <label>본문 2</label>
        <textarea id="c2" rows="5">${esc(article?.content2 || '')}</textarea>
      </div>
      <div class="nw-form-row">
        <label>본문 3</label>
        <textarea id="c3" rows="5">${esc(article?.content3 || '')}</textarea>
      </div>
      <div class="nw-form-row">
        <label>본문 4</label>
        <textarea id="c4" rows="5">${esc(article?.content4 || '')}</textarea>
      </div>
      ${[1, 2, 3, 4]
        .map((n) => {
          const checked = initialCoverKey === 'image' + n ? 'checked' : '';
          return `
        <div class="nw-form-row nw-file-block" id="fileBlock${n}">
          <label>이미지 ${n}</label>
          <input type="file" id="img${n}" accept="image/*" />
          <div id="imgPreview${n}" class="nw-img-preview" aria-live="polite"></div>
          <p id="imgStatus${n}" class="nw-muted" style="margin:4px 0 0 0;"></p>
          <div style="margin-top:6px;">
            <button type="button" class="nw-btn nw-btn--small" id="btnRemove${n}">이미지 ${n} 삭제</button>
          </div>
          <label>이미지 ${n} 설명</label>
          <textarea id="cap${n}" rows="2">${esc(article?.['image' + n + '_caption'] || '')}</textarea>
          <div class="nw-form-row">
            <label><input type="radio" name="coverImageKey" value="image${n}" ${checked}/> 대표이미지로 선택</label>
          </div>
        </div>`;
        })
        .join('')}
      <p id="formErr" class="nw-error" style="display:none;"></p>
      <p id="formSaveLongWait" class="nw-muted nw-dash-longwait" hidden role="status">${NW_FORM_LONG_WAIT_HINT}</p>
      <p id="formSaveBusy" class="nw-form-busy" hidden aria-live="polite">
        <span class="nw-spinner" aria-hidden="true"></span> 등록·저장 중…
      </p>
      <div class="nw-btn-row">
        <button type="button" class="nw-btn" id="btnSpell">맞춤법 검사</button>
        <button type="button" class="nw-btn" id="btnPrev">미리보기</button>
        <button type="button" class="nw-btn" id="btnDraft">임시저장</button>
        ${session.role === 'reporter' ? `<button type="button" class="nw-btn" id="btnDone">작성완료</button>` : ''}
        ${session.role === 'reporter' ? `<button type="button" class="nw-btn nw-btn-primary" id="btnSend">송고</button>` : ''}
        ${session.role !== 'reporter' ? `<button type="button" class="nw-btn nw-btn-primary" id="btnSaveStaff">저장</button>` : ''}
      </div>
    </form>
    <div id="prevModal" class="nw-modal" style="display:none;">
      <div class="nw-modal-inner">
        <button type="button" class="nw-modal-x" id="closePrev">×</button>
        <div id="prevBody"></div>
      </div>
    </div>`;

  const activeNav =
    isNew ? '/admin/article/new' : '/admin/article/' + articleId + '/edit';
  app.innerHTML = renderShell({
    title: isNew ? '기사 작성' : '기사 수정 (' + articleId + ')',
    activePath: activeNav,
    navHtml: navFor(session, activeNav),
    bodyHtml: body,
  });
  bindShell(app, { navigate });

  const form = app.querySelector('#artForm');
  const errEl = app.querySelector('#formErr');
  const busyEl = app.querySelector('#formSaveBusy');
  const longWaitEl = app.querySelector('#formSaveLongWait');

  function setFormBusy(busy) {
    form.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (busyEl) busyEl.hidden = !busy;
    if (longWaitEl && !busy) longWaitEl.hidden = true;
    app.querySelectorAll('.nw-btn-row button').forEach((b) => {
      b.disabled = !!busy;
    });
  }

  async function gatherPayload(statusMaybe) {
    const payload = {
      title: app.querySelector('#title').value.trim(),
      subtitle: app.querySelector('#subtitle').value.trim(),
      category: app.querySelector('#category').value,
      content1: app.querySelector('#c1').value.trim(),
      content2: app.querySelector('#c2').value.trim(),
      content3: app.querySelector('#c3').value.trim(),
      content4: app.querySelector('#c4').value.trim(),
      image1_caption: app.querySelector('#cap1').value.trim(),
      image2_caption: app.querySelector('#cap2').value.trim(),
      image3_caption: app.querySelector('#cap3').value.trim(),
      image4_caption: app.querySelector('#cap4').value.trim(),
    };
    if (statusMaybe !== undefined) payload.status = statusMaybe;
    // image slots: send null only if user explicitly marked removal,
    // send base64 if uploading new file, otherwise leave undefined to preserve existing DB value.
    for (const n of [1, 2, 3, 4]) {
      const f = app.querySelector('#img' + n).files[0];
      const removeFlag = removedImages && removedImages[n];
      if (removeFlag) {
        payload['image' + n] = null; // explicit delete request
      } else if (f) {
        payload['image' + n] = await fileToBase64(f);
      } else {
        // do not include existing image URLs in payload — leave undefined so backend won't overwrite
      }
    }
    // coverImageKey radio: only send if user explicitly selected a radio.
    const coverEl = app.querySelector('input[name="coverImageKey"]:checked');
    if (coverEl) {
      payload.coverImageKey = String(coverEl.value || '').trim();
    }
    // Debug: log gathered payload summary (do not log full base64 to avoid huge logs)
    try {
      console.info(
        '[nw/gatherPayload]',
        JSON.stringify({
          id: article && article.id,
          keys: Object.keys(payload || {}),
          imageLens: {
            image1: String(payload.image1 || '').length,
            image2: String(payload.image2 || '').length,
            image3: String(payload.image3 || '').length,
            image4: String(payload.image4 || '').length,
          },
          coverImageKey: payload.coverImageKey || '',
        }),
      );
    } catch (_) {}
    return payload;
  }

  async function saveReporter(status) {
    errEl.style.display = 'none';
    const payload = await gatherPayload(status);
    if (!payload.title) {
      errEl.textContent = '제목을 입력하세요.';
      errEl.style.display = 'block';
      return;
    }
    const url = isNew ? '/api/articles' : '/api/articles/' + articleId;
    const method = isNew ? 'POST' : 'PATCH';
    setFormBusy(true);
    const longTimerRep = setTimeout(() => {
      if (longWaitEl) longWaitEl.hidden = false;
    }, NW_SAVE_LONG_WAIT_MS);
    try {
      const { res, data } = await apiFetch(url, {
        method,
        headers: authHeaders(session.token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        alert('세션이 만료되었습니다.');
        navigate(loginPathForRole(session.role));
        return;
      }
      if (!res.ok) {
        const rawErr = (data && data.error) || '저장 실패';
        const slow =
          res.status === 502 ||
          res.status === 503 ||
          res.status === 504 ||
          res.status === 408 ||
          /timeout|ETIMEDOUT|Gateway|unavailable/i.test(String(rawErr));
        errEl.textContent = slow ? NW_SAVE_SLOW_MSG : rawErr;
        errEl.style.display = 'block';
        return;
      }
      bumpMainArticleListCache();
      const id = isNew ? data.id : articleId;
      const savedMsg =
        status === 'submitted' ? '송고되었습니다.' : '저장되었습니다.';
      if (isNew) {
        if (status === 'submitted') alert(savedMsg);
        navigate('/admin/article/' + id + '/edit');
      } else {
        alert(savedMsg);
        const patch = data.article || data;
        article =
          patch && typeof patch === 'object' && article && typeof article === 'object'
            ? Object.assign({}, article, patch)
            : patch || article;
      }
    } catch (_e) {
      errEl.textContent = NW_SAVE_SLOW_MSG;
      errEl.style.display = 'block';
    } finally {
      clearTimeout(longTimerRep);
      if (longWaitEl) longWaitEl.hidden = true;
      setFormBusy(false);
    }
  }

  async function saveStaff() {
    errEl.style.display = 'none';
    const payload = await gatherPayload();
    setFormBusy(true);
    const longTimerStaff = setTimeout(() => {
      if (longWaitEl) longWaitEl.hidden = false;
    }, NW_SAVE_LONG_WAIT_MS);
    try {
      const { res, data } = await apiFetch('/api/articles/' + articleId, {
        method: 'PATCH',
        headers: authHeaders(session.token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        alert('세션이 만료되었습니다.');
        navigate(loginPathForRole(session.role));
        return;
      }
      if (!res.ok) {
        const rawErr = (data && data.error) || '저장 실패';
        const slow =
          res.status === 502 ||
          res.status === 503 ||
          res.status === 504 ||
          res.status === 408 ||
          /timeout|ETIMEDOUT|Gateway|unavailable/i.test(String(rawErr));
        errEl.textContent = slow ? NW_SAVE_SLOW_MSG : rawErr;
        errEl.style.display = 'block';
        return;
      }
      bumpMainArticleListCache();
      alert((data && data.message) || '저장되었습니다.');
      if (data && data.article && article && typeof article === 'object') {
        article = Object.assign({}, article, data.article);
      } else if (data && data.article) {
        article = data.article;
      }
    } catch (_e) {
      errEl.textContent = NW_SAVE_SLOW_MSG;
      errEl.style.display = 'block';
    } finally {
      clearTimeout(longTimerStaff);
      if (longWaitEl) longWaitEl.hidden = true;
      setFormBusy(false);
    }
  }

  app.querySelector('#btnDraft').addEventListener('click', () => {
    if (session.role === 'reporter') saveReporter('draft');
    else saveStaff();
  });
  const btnDone = app.querySelector('#btnDone');
  if (btnDone) btnDone.addEventListener('click', () => saveReporter('pending'));
  const btnSend = app.querySelector('#btnSend');
  if (btnSend) btnSend.addEventListener('click', () => saveReporter('submitted'));
  const btnStaff = app.querySelector('#btnSaveStaff');
  if (btnStaff) btnStaff.addEventListener('click', () => saveStaff());

  app.querySelector('#btnSpell').addEventListener('click', () => {
    const t =
      app.querySelector('#title').value +
      app.querySelector('#subtitle').value +
      app.querySelector('#c1').value +
      app.querySelector('#c2').value +
      app.querySelector('#c3').value +
      app.querySelector('#c4').value;
    alert(
      t.trim()
        ? '맞춤법 검사는 추후 API 연동 시 활성화됩니다. (현재 입력 길이: ' + t.length + '자)'
        : '내용을 입력한 뒤 실행하세요.'
    );
  });

  app.querySelector('#btnPrev').addEventListener('click', async () => {
    const payload = await gatherPayload();
    const modal = app.querySelector('#prevModal');
    const prevBody = app.querySelector('#prevBody');
    const catVal = payload.category || '';
    const catShown = categoryLabelForValue(catVal) || '—';
    const bylineName = reporterDisplayName(
      app.querySelector('#authorName').value || session.name || article?.author_name || ''
    );
    let pubD = '—';
    let updD = '—';
    if (article) {
      const pubRaw = article.published_at;
      const creRaw = article.created_at;
      const updRaw = article.updated_at;
      pubD = formatArticleMetaDateYmd(
        pubRaw != null && String(pubRaw).trim() !== '' ? pubRaw : creRaw
      );
      updD = formatArticleMetaDateYmd(
        updRaw != null && String(updRaw).trim() !== '' ? updRaw : creRaw
      );
    }
    let h = '<h2>' + esc(payload.title || '(제목 없음)') + '</h2>';
    if (payload.subtitle) h += '<p class="sub">' + esc(payload.subtitle) + '</p>';
    h +=
      '<div class="prev-meta-bar">' +
      '<span class="prev-cat">' +
      esc(catShown) +
      '</span>' +
      '<span class="prev-byline">' +
      esc(bylineName) +
      ' · 발행일 ' +
      esc(pubD) +
      ' · 수정일 ' +
      esc(updD) +
      '</span></div>';
    for (const n of [1, 2, 3, 4]) {
      const imgKey = 'image' + n;
      let src = payload[imgKey];
      if (!src && article && article[imgKey]) src = article[imgKey];
      const cap = payload['image' + n + '_caption'];
      const cx = app.querySelector('#c' + n).value.trim();
      if (cx) h += '<div class="body">' + esc(cx).replace(/\n/g, '<br/>') + '</div>';
      if (src) h += '<img src="' + escAttr(src) + '" class="prev-img" alt="" />';
      if (cap) h += '<p class="cap">' + esc(cap) + '</p>';
    }
    h +=
      '<p class="prev-footer">저작권자 © 뉴스의창 무단전재 및 재배포 금지</p>';
    prevBody.innerHTML = h;
    modal.style.display = 'flex';
  });
  app.querySelector('#closePrev').addEventListener('click', () => {
    app.querySelector('#prevModal').style.display = 'none';
  });

  function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;');
  }
  // Populate preview areas and status text for each image slot without attempting to set file inputs.
  try {
    for (const n of [1, 2, 3, 4]) {
      const imgKey = 'image' + n;
      const previewEl = app.querySelector('#imgPreview' + n);
      const statusEl = app.querySelector('#imgStatus' + n);
      if (previewEl) previewEl.innerHTML = '';
      if (statusEl) statusEl.textContent = '';
      let src = '';
      if (article && article[imgKey]) src = String(article[imgKey]).trim();
      // If no slot URL but article.primaryImage equals this slot's value, show that.
      if (!src && article && article.primaryImage) {
        try {
          if (String(article.primaryImage).trim() === String(article[imgKey] || '').trim()) {
            src = String(article.primaryImage).trim();
          }
        } catch (_e) {}
      }
      if (src) {
        if (previewEl) {
          const im = document.createElement('img');
          im.src = src;
          im.alt = '';
          im.style.maxWidth = '320px';
          im.style.display = 'block';
          im.style.marginTop = '6px';
          previewEl.appendChild(im);
        }
        if (statusEl)
          statusEl.textContent = '현재 저장된 이미지 있음 — 새 파일을 선택하면 기존 이미지를 교체합니다.';
      } else {
        if (statusEl) statusEl.textContent = '현재 저장된 이미지 없음';
      }
    }
  } catch (_e) {}
  // Track explicit removal requests from the UI (deleted by user).
  const removedImages = { 1: false, 2: false, 3: false, 4: false };
  try {
    for (const n of [1, 2, 3, 4]) {
      const btn = app.querySelector('#btnRemove' + n);
      const previewEl = app.querySelector('#imgPreview' + n);
      const statusEl = app.querySelector('#imgStatus' + n);
      const radioEl = app.querySelector('input[name="coverImageKey"][value="image' + n + '"]');
      if (!btn) continue;
      btn.addEventListener('click', () => {
        removedImages[n] = true;
        // clear preview
        if (previewEl) previewEl.innerHTML = '';
        if (statusEl) statusEl.textContent = '삭제 예정: 저장 시 서버에서 이미지가 제거됩니다.';
        // clear file input
        const fin = app.querySelector('#img' + n);
        if (fin) fin.value = '';
        // if this slot was selected as cover, unselect it
        if (radioEl && radioEl.checked) radioEl.checked = false;
      });
    }
  } catch (_e) {}
}
