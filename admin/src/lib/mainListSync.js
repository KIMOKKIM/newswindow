/** 메인(index) 탭이 `storage` 이벤트로 public/list 를 다시 불러오게 할 때 사용 (www 동일 출처일 때만 동작) */
export function bumpMainArticleListCache() {
  try {
    localStorage.setItem('nw_main_articles_invalidate', String(Date.now()));
  } catch (_) {
    /* ignore */
  }
}
