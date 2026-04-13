const T = {
  noTitle: '(\uC81C\uBAA9 \uC5C6\uC74C)',
  emptyRow: '\uAE30\uC0AC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  newArticle: '\uAE30\uC0AC \uC791\uC131',
  editProfile: '\uC815\uBCF4 \uC218\uC815',
  lead:
    '\uC1A1\uACE0\uD55C \uAE30\uC0AC\uB294 \uD3B8\uC9D1\uC7A5\uC774 \uC2B9\uC778\uD558\uAE30 \uC804\uAE4C\uC9C0 \uC77C\uBC18 \uB3C5\uC790\uC5D0\uAC8C\uB294 \uBCF4\uC774\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
  thNum: '\uBC88\uD638',
  thTitle: '\uC81C\uBAA9',
  thStatus: '\uC0C1\uD0DC \u00B7 \uB178\uCD9C',
  thCat: '\uCE74\uD14C\uACE0\uB9AC',
  thCreated: '\uB4F1\uB85D\uC77C',
  thUpdated: '\uC218\uC815\uC77C',
  thViews: '\uC870\uD68C\uC218',
  thAction: '\uC561\uC158',
  edit: '\uC218\uC815',
  preview: '\uBBF8\uB9AC\uBCF4\uAE30',
};

/**
 * @param {unknown[]} list
 * @param {{ esc: (s: unknown) => string, reporterStatusCell: (stRaw: unknown) => string }} h
 */
export function buildReporterDashboardBody(list, h) {
  const { esc, reporterStatusCell } = h;
  const rows = list
    .map(
      (a) => `
    <tr>
      <td>${a.id}</td>
      <td><a href="/admin/article/${a.id}/edit" data-link>${esc(a.title || T.noTitle)}</a></td>
      <td>${reporterStatusCell(a.status)}</td>
      <td>${esc(a.category || '')}</td>
      <td>${esc((a.created_at || '').slice(0, 19))}</td>
      <td>${esc((a.updated_at || '').slice(0, 19))}</td>
      <td>${Number(a.views) || 0}</td>
      <td>
        <a href="/admin/article/${a.id}/edit" data-link>${T.edit}</a>
        \u00B7 <a href="/admin/article/${a.id}/preview" data-link>${T.preview}</a>
      </td>
    </tr>`,
    )
    .join('');

  return `
    <div class="nw-toolbar">
      <a href="/admin/article/new" class="nw-btn nw-btn-primary" data-link>${T.newArticle}</a>
      <a href="/admin/reporter/profile" class="nw-btn" data-link>${T.editProfile}</a>
    </div>
    <p class="nw-muted" style="margin:10px 0 14px">${T.lead}</p>
    <div class="nw-table-wrap">
      <table class="nw-table">
        <thead>
          <tr>
            <th>${T.thNum}</th><th>${T.thTitle}</th><th>${T.thStatus}</th><th>${T.thCat}</th>
            <th>${T.thCreated}</th><th>${T.thUpdated}</th><th>${T.thViews}</th><th>${T.thAction}</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="8">${T.emptyRow}</td></tr>`}</tbody>
      </table>
    </div>`;
}
