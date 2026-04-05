# 기사 작성 버튼 → 로그인 오리다이렉트 수정 보고서

**범위:** 기자 대시보드「기사작성」클릭 시 `login.html?role=reporter` 로만 가던 현상만 최소 수정.

---

## 1. 버튼 DOM·클릭 경로

| 항목 | 내용 |
|------|------|
| **파일** | `nw-office/reporter.html` |
| **요소** | `<a href="article-write.html" class="nw-btn" …>기사작성</a>` (약 74행) |
| **클릭 시** | 브라우저 기본 동작으로 `nw-office/article-write.html` 로 이동 (별도 `onclick`/`location` 없음) |
| **login 으로 보내는 쪽** | `article-write.html` 로드 직후 인라인 스크립트의 **인증 가드** |

결론: 버튼 `href` 가 잘못된 것이 아니라, **작성 페이지 초기 스크립트**가 조건을 만족하지 못해 즉시 `login.html` 로 보낸 것.

---

## 2. 인증 가드 (수정 전)

**파일:** `nw-office/article-write.html`

```text
const token = localStorage.getItem('accessToken');
const role = (localStorage.getItem('role') || '').trim().toLowerCase();
if (!token || role !== 'reporter') {
  window.location.href = 'login.html?role=reporter';
}
```

- **판정 기준:** `accessToken` 존재 + `localStorage.role === 'reporter'` (소문자 정규화만).
- **문제:** JWT에는 `role: reporter` 가 있는데 **`role` 키가 비어 있거나 오래된 값**이면(다른 탭·수동 저장·예전 버그 등) 대시보드에 남아 있어도 작성 페이지만 가드에 걸림.

`reporter.html` 진입 가드도 동일한 `localStorage.role` 이라 이론상 같이 실패해야 하나, **작성 페이지만 재현**되는 경우는 `role` 이 작성 페이지 로드 시점에만 비어 있는 시나리오와 부합함.

---

## 3. 수정 내용 (최소)

**파일:** `nw-office/article-write.html`

1. JWT 페이로드에서 `role` 을 읽는 `nwPayloadFromJwt` / `nwNormalizeRole` 추가.
2. `role` 결정: **파싱된 `jwtRole`이 있으면 우선**, 없으면 기존처럼 `localStorage.role`.
3. `jwtRole` 이 있으면 `localStorage.role` 에 **동기화** (다음 페이지와 일치).
4. `name` 이 비어 있고 JWT에 `name` 이 있으면 `localStorage` 에 보강.
5. 가드 실패 시 `NW_DEBUG` 일 때 `redirectReason`, `role`, `jwtRole` 등 **콘솔 경고**.
6. 리다이렉트는 `location.replace` 로 변경 (히스토리 백 시 작성 페이지 루프 완화).

**파일:** `nw-office/reporter.html`

- 「기사작성」`<a href="article-write.html">`에만, `?nwdebug=1` 또는 `localStorage.nwOfficeDebug=1` 일 때 **클릭 로그** (`[nw-write-btn]`) 출력. 기본 동작은 변경 없음.

---

## 4. 분기 요약

| 단계 | 수정 전 | 수정 후 |
|------|---------|---------|
| role 출처 | `localStorage` 만 | JWT 우선, 없으면 `localStorage` |
| 불일치 시 | 즉시 login | JWT가 `reporter` 면 허용 + storage 동기화 |
| 디버그 | 없음 | 가드 성공/실패·버튼 클릭 로그 |

---

## 5. 브라우저 검증 안내

이 환경에서는 DOM 자동 클릭을 수행하지 않았습니다. 로컬에서 아래를 권장합니다.

1. `nw-office/login.html?role=reporter` 로 로그인 후 `reporter.html` 진입.
2. 「기사작성」클릭 → **`article-write.html`** 이 열리고 폼이 보일 것.
3. 선택: `reporter.html?nwdebug=1` 에서 클릭 시 콘솔에 `[nw-write-btn]` 확인.
4. 선택: `article-write` 가드는 `nwOfficeDebug=1` 또는 URL `nwdebug=1` 시 `[article-write] auth guard ok` / 실패 시 `redirectReason` 확인.
5. **만료/미로그인:** `localStorage` 비운 뒤 `article-write.html` 직접 열면 login 으로 이동해야 함 (기존과 동일 의도).

---

## 6. 남은 이슈

- JWT 만료 후에도 디코딩만으로는 `role` 을 알 수 있어 **폼은 열리고**, 저장 시 401 후 기존 로직으로 login 이동할 수 있음 (이번 변경 범위 밖).
