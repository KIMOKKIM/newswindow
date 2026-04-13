import { apiFetch, authHeaders } from '../api/client.js';
import { bumpMainArticleListCache } from './mainListSync.js';

const T = {
  approve: '\uC2B9\uC778',
  reject: '\uBC18\uB824',
  preview: '\uBBF8\uB9AC\uBCF4\uAE30',
  noTitle: '(\uC81C\uBAA9 \uC5C6\uC74C)',
  emptyRow: '\uAE30\uC0AC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  reporterListH2: '\uAE30\uC790 \uBAA9\uB85D',
  reporterListLead:
    '\uC0AC\uC6A9\uC790 API \uC5F0\uB3D9\uC740 \uCD94\uD6C4 \uD655\uC7A5. \uD604\uC7AC\uB294 \uAE30\uC0AC \uD14C\uC774\uBE14\uC5D0\uC11C \uC791\uC131\uC790\uBA85\uC744 \uD655\uC778\uD558\uC138\uC694.',
  articleListH2: '\uAE30\uC0AC \uBAA9\uB85D',
  busy: '\uCC98\uB9AC \uC911\u2026',
  thNum: '\uBC88\uD638',
  thTitle: '\uC81C\uBAA9',
  thAuthor: '\uC791\uC131\uC790',
  thStatus: '\uC0C1\uD0DC \u00B7 \uB178\uCD9C',
  thCreated: '\uB4F1\uB85D\uC77C',
  thViews: '\uC870\uD68C\uC218',
  thAct: '\uC2B9\uC778/\uBC18\uB824',
  sessionExpired: '\uC138\uC158\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
  procFail: '\uCC98\uB9AC \uC2E4\uD328',
  procOk: '\uCC98\uB9AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
  confirmReject: '\uC774 \uAE30\uC0AC\uB97C \uBC18\uB824\uD560\uAE4C\uC694?',
};

/**
 * @param {unknown[]} list
 * @param {'editor'|'admin'} mode
 * @param {{ esc: (s: unknown) => string, statusCellHtml: (stRaw: unknown) => string }} h
 */
export function buildStaffDashboardBody(list, mode, h) {
  const { esc, statusCellHtml } = h;
  const rows = list
    .map((a) => {
      const stl = (a.status || '').toLowerCase();
      const canAct = stl === 'submitted' || stl === 'pending' || stl === 'sent';
      const actions =
        (canAct
          ? `<button type="button" class="nw-btn-sm nw-ok" data-appr="${a.id}">${T.approve}</button>
             <button type="button" class="nw-btn-sm nw-danger" data-rej="${a.id}">${T.reject}</button>`
          : '\u2014') +
        ` \u00B7 <a href="/admin/article/${a.id}/preview" data-link>${T.preview}</a>`;
      return `
    <tr>
      <td>${a.id}</td>
      <td><a href="/admin/article/${a.id}/edit" data-link>${esc(a.title || T.noTitle)}</a></td>
      <td>${esc(a.author_name || '')}</td>
      <td>${statusCellHtml(a.status)}</td>
      <td>${esc((a.created_at || '').slice(0, 19))}</td>
      <td>${Number(a.views) || 0}</td>
      <td>${actions}</td>
    </tr>`;
    })
    .join('');

  const reportersBlock =
    mode === 'admin'
      ? `<section class="nw-section"><h2>${T.reporterListH2}</h2><p class="nw-muted">${T.reporterListLead}</p></section>`
      : '';

  return `
    ${reportersBlock}
    <section class="nw-section">
      <h2>${T.articleListH2}</h2>
      <p id="staffDashBusy" class="nw-form-busy" hidden aria-live="polite">
        <span class="nw-spinner" aria-hidden="true"></span> ${T.busy}
      </p>
      <div class="nw-table-wrap">
        <table class="nw-table">
          <thead>
            <tr>
              <th>${T.thNum}</th><th>${T.thTitle}</th><th>${T.thAuthor}</th><th>${T.thStatus}</th><th>${T.thCreated}</th><th>${T.thViews}</th><th>${T.thAct}</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="7">${T.emptyRow}</td></tr>`}</tbody>
        </table>
      </div>
    </section>`;
}

/**
 * @param {() => Promise<void>} refetch
 */
export function bindStaffDashboardPatchHandlers(app, navigate, mode, session, refetch) {
  const busyEl = app.querySelector('#staffDashBusy');
  let actionBusy = false;

  async function patchAction(id, action) {
    if (actionBusy) return;
    actionBusy = true;
    const buttons = app.querySelectorAll('[data-appr], [data-rej]');
    buttons.forEach((b) => {
      b.disabled = true;
    });
    if (busyEl) busyEl.hidden = false;
    try {
      const { res, data: d } = await apiFetch('/api/articles/' + id, {
        method: 'PATCH',
        headers: authHeaders(session.token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action }),
      });
      if (res.status === 401) {
        alert(T.sessionExpired);
        navigate(mode === 'admin' ? '/admin/admin/login' : '/admin/editor/login');
        return;
      }
      if (!res.ok) {
        alert((d && d.error) || T.procFail);
        return;
      }
      bumpMainArticleListCache();
      if (d && d.idempotent) {
        await refetch();
        return;
      }
      alert((d && d.message) || T.procOk);
      await refetch();
    } finally {
      actionBusy = false;
      if (busyEl) busyEl.hidden = true;
      app.querySelectorAll('[data-appr], [data-rej]').forEach((b) => {
        b.disabled = false;
      });
    }
  }

  app.querySelectorAll('[data-appr]').forEach((btn) => {
    btn.addEventListener('click', () => patchAction(btn.getAttribute('data-appr'), 'approve'));
  });
  app.querySelectorAll('[data-rej]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (confirm(T.confirmReject)) patchAction(btn.getAttribute('data-rej'), 'reject');
    });
  });
}
