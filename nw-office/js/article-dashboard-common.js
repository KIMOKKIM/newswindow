/**
 * 기자/편집장 대시보드 공통: 기사 키, API 베이스, 상세 fetch, HTTP 오류 분류.
 * 디버그: ?nwdebug=1 또는 localStorage.nwOfficeDebug=1
 */
(function (global) {
  const NW_DEBUG =
    typeof location !== 'undefined' &&
    (/(\?|&)nwdebug=1(?:&|$)/.test(location.search) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('nwOfficeDebug') === '1'));

  function nwLog() {
    if (NW_DEBUG) console.log.apply(console, arguments);
  }

  function articleRowKey(a) {
    if (!a) return '';
    const k =
      a.id != null && a.id !== ''
        ? a.id
        : a._id != null && a._id !== ''
          ? a._id
          : a.articleId != null && a.articleId !== ''
            ? a.articleId
            : a.slug;
    if (k == null || k === '') {
      console.error('[article-dash] article key missing', a);
      return '';
    }
    return String(k);
  }

  /** file://(host 빈문자), ::1, LAN IP 등에서 상대 /api 로 가면 목록이 비는 경우가 많음 */
  function resolveOfficeApiBase() {
    try {
      const hostRaw = location && location.hostname != null ? String(location.hostname) : '';
      const host = hostRaw.trim();
      const h = host.toLowerCase();
      if (!h) return 'http://127.0.0.1:3000/api';
      if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return 'http://127.0.0.1:3000/api';
      if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h))
        return 'http://127.0.0.1:3000/api';
      if (host === 'www.newswindow.kr' || host === 'newswindow.kr') {
        return 'https://newswindow-backend.onrender.com/api';
      }
      return '/api';
    } catch (e) {
      return 'http://127.0.0.1:3000/api';
    }
  }

  function getApiRead() {
    return resolveOfficeApiBase();
  }

  function getApiWrite() {
    return resolveOfficeApiBase();
  }

  function authHeaders(token, extra) {
    const h = Object.assign({ Authorization: 'Bearer ' + token, Accept: 'application/json' }, extra || {});
    return h;
  }

  function classifyFetchError(status, bodyText) {
    const t = (bodyText || '').slice(0, 600);
    if (status === 401) return { kind: 'auth', msg: '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.' };
    if (status === 403) return { kind: 'forbidden', msg: '이 기사에 접근할 권한이 없습니다.' };
    if (status === 404) return { kind: 'notfound', msg: '기사 정보를 찾을 수 없습니다.' };
    if (status === 400) return { kind: 'badrequest', msg: '요청이 올바르지 않습니다.' };
    if (status >= 500) return { kind: 'server', msg: '기사 데이터를 불러오는 중 오류가 발생했습니다.' };
    return { kind: 'unknown', msg: '기사 데이터를 불러오는 중 오류가 발생했습니다.' };
  }

  async function fetchArticleDetail(apiRead, token, articleKey, label) {
    const key = String(articleKey == null ? '' : articleKey).trim();
    if (!key) {
      nwLog('[' + (label || 'dash') + '] empty article key');
      return {
        ok: false,
        status: 0,
        err: { kind: 'badkey', msg: '기사 식별값이 올바르지 않습니다.' },
      };
    }
    const url = apiRead + '/articles/' + encodeURIComponent(key);
    nwLog('[' + (label || 'dash') + '] GET article', { url, key, tokenPresent: !!token });
    const res = await fetch(url, { headers: authHeaders(token) });
    nwLog('[article] detail fetch status', { label: label || 'dash', status: res.status, ok: res.ok });
    const text = await res.text().catch(() => '');
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      nwLog('[' + (label || 'dash') + '] JSON parse fail', e);
      if (!res.ok) return { ok: false, status: res.status, err: classifyFetchError(res.status, text), raw: text };
      return {
        ok: false,
        status: res.status,
        err: { kind: 'corrupt', msg: '기사 데이터 형식이 올바르지 않습니다.' },
        raw: text,
      };
    }
    if (!res.ok) {
      const err = classifyFetchError(res.status, text);
      if (data && data.error) err.msg = data.error;
      if (NW_DEBUG) nwLog('[article] detail denied reason', { label: label || 'dash', kind: err.kind, status: res.status });
      return { ok: false, status: res.status, err, data, raw: text };
    }
    if (!data || typeof data !== 'object') {
      return {
        ok: false,
        status: res.status,
        err: { kind: 'corrupt', msg: '기사 데이터 형식이 올바르지 않습니다.' },
        data,
      };
    }
    nwLog('[' + (label || 'dash') + '] GET article OK', {
      status: res.status,
      id: data.id,
      keys: Object.keys(data).slice(0, 20),
    });
    return { ok: true, status: res.status, article: data };
  }

  global.NwArticleDashboard = {
    NW_DEBUG: NW_DEBUG,
    nwLog: nwLog,
    articleRowKey: articleRowKey,
    getApiRead: getApiRead,
    getApiWrite: getApiWrite,
    authHeaders: authHeaders,
    classifyFetchError: classifyFetchError,
    fetchArticleDetail: fetchArticleDetail,
  };
})(typeof window !== 'undefined' ? window : this);
