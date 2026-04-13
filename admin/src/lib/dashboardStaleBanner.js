/**
 * Offline / 5xx fallback banner (Korean copy via Unicode escapes to avoid encoding issues).
 * @param {{ esc: (s: unknown) => string, fail: { category: string }, detailInnerHtml: string, retryButtonId: string }} opts
 */
export function dashboardStaleBannerHtml(opts) {
  const { esc, fail, detailInnerHtml, retryButtonId } = opts;
  const title =
    '\uC5F0\uACB0\uC774 \uBD88\uC548\uC815\uD558\uAC70\uB098 \uC11C\uBC84 \uC624\uB958\uB85C \uCD5C\uC2E0 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.';
  const sub =
    '\uC544\uB798 \uD45C\uB294 \uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0 \uC800\uC7A5\uB41C \uB9C8\uC9C0\uB9C9\uC73C\uB85C \uC131\uACF5\uD55C \uBAA9\uB85D\uC785\uB2C8\uB2E4. \uB124\uD2B8\uC6CC\uD06C\uB97C \uD655\uC778\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.';
  const typ = '\uC720\uD615';
  const retry = '\uB2E4\uC2DC \uC2DC\uB3C4';
  return (
    `<div class="nw-admin-alert nw-admin-alert--warn" role="status">` +
    `<p><strong>${esc(title)}</strong></p>` +
    `<p class="nw-muted">${sub}</p>` +
    `<p class="nw-muted">${typ}: ${esc(fail.category)}</p>` +
    detailInnerHtml +
    `<p><button type="button" class="nw-btn" id="${String(retryButtonId).replace(/"/g, '&quot;')}">${esc(retry)}</button></p>` +
    `</div>`
  );
}
