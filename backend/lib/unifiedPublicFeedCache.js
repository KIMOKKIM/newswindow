/**
 * 서버 메모리: 통합 공개 피드 행 배열 (정렬 완료).
 * approve/publish 시 clearHomePublicFeedCaches()로 무효화 — 다음 요청에서 DB 재로드.
 */

/** @type {unknown[] | null} */
let cachedRows = null;

/** @type {Promise<unknown[]> | null} */
let inFlight = null;

export function clearUnifiedPublicFeedCache() {
  cachedRows = null;
  inFlight = null;
}

/**
 * @param {() => Promise<unknown[]>} loader
 */
export async function getUnifiedPublicFeedCached(loader) {
  if (cachedRows) return cachedRows;
  if (!inFlight) {
    inFlight = loader()
      .then((rows) => {
        cachedRows = rows;
        return rows;
      })
      .catch((e) => {
        inFlight = null;
        throw e;
      });
  }
  return inFlight;
}
