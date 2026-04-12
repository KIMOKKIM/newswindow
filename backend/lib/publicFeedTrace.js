/**
 * 특정 기사가 파이프라인 각 단계에 포함되는지 추적 (NW_PUBLIC_FEED_TRACE=1 권장).
 */

/** @type {{ id: string, needle: string }[]} */
export const PUBLIC_FEED_TRACE_MARKERS = [
  { id: 'twosome', needle: '투썸플레이스' },
  { id: 'samsung_ai', needle: "AI 무풍" },
];

function traceEnabled() {
  const t = String(process.env.NW_PUBLIC_FEED_TRACE || '').trim();
  const d = String(process.env.NW_PUBLIC_FEED_DEBUG || '').trim();
  return t === '1' || d === '1';
}

function rowTitle(r) {
  if (!r || typeof r !== 'object') return '';
  return String(r.title ?? '');
}

/**
 * @param {string} stage
 * @param {unknown[]} rows
 * @param {Record<string, unknown>} [extra]
 */
export function tracePublicFeedPresence(stage, rows, extra) {
  if (!traceEnabled()) return;
  try {
    const markers = {};
    for (const m of PUBLIC_FEED_TRACE_MARKERS) {
      const hit = (rows || []).find((r) => r && rowTitle(r).includes(m.needle));
      markers[m.id] = hit
        ? { id: Number(hit.id), title: rowTitle(hit).slice(0, 160) }
        : null;
    }
    console.log(
      '[nw/feed-trace]',
      JSON.stringify({
        stage,
        rowCount: Array.isArray(rows) ? rows.length : 0,
        markers,
        ...(extra && typeof extra === 'object' ? extra : {}),
      }),
    );
  } catch (e) {
    console.warn('[nw/feed-trace] error', e && e.message);
  }
}
