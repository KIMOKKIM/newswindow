# 본문 수정 후 로그인 redirect 재검증

## 전제

- `api/_sharedProxy.js` 배포 후 `POST /api/auth/login` 응답에 **JSON 본문**이 오고, `accessToken`·`role` 이 파싱 가능해야 한다.
- **이 문서 작성 시점:** 운영 Vercel은 **아직 구버전 프록시**일 수 있어, 아래 “기대 결과”는 **배포 반영 후** `scripts/auth-dual-endpoint-check.js` 및 브라우저로 채운다.

## 기대 redirect (`nw-office/login.html` 기존 분기)

| 계정 | 응답 `role` | 최종 URL |
|------|----------------|----------|
| admin1 | `admin` | `/nw-office/admin.html` |
| teomok1 | `editor_in_chief` | `/nw-office/editor.html` |
| teomok2 | `reporter` | `/nw-office/reporter.html` |

## 검증 체크리스트 (계정별)

1. 네트워크 탭: `POST .../api/auth/login` → 응답 본문에 `accessToken`, `role`.
2. Application → Local Storage: `accessToken`, `role` 저장 여부.
3. 주소창: 위 표의 최종 경로.
4. 대시보드: 404/500 없이 레이아웃·메뉴 로드.

## 자동 스모크

```bash
node scripts/auth-dual-endpoint-check.js
```

Vercel 행에서 `rawLen` > 0, `accessToken: true`, `role` 이 기대값인지 확인.
