# 로그인 성공 여부 확정 (운영)

## 공통 요청

| 항목 | 값 |
|------|-----|
| URL | `POST https://www.newswindow.kr/api/auth/login` |
| Body | `{"userid":"<id>","password":"…"}` (`Content-Type: application/json`) |

## 응답 필드 (백엔드 `backend/routes/auth.js` 설계)

| 필드 | 존재 |
|------|------|
| `accessToken` | JWT 문자열 (성공 시) |
| `role` | DB `users.role` (소문자 `role` 키) |
| `name` | 표시용 이름 |
| `success` | **없음** (플래그 미사용, `status` 200 으로 성공 판정) |
| `Set-Cookie` | **없음** (쿠키 미발급, 토큰은 JSON) |

## 2026-04-01 운영 측정 1회 (`node scripts/prod-login-check.js`)

계정마다 동일 패턴이었음.

| 계정 | status | Content-Type | 본문 길이 | JSON 파싱 | accessToken | Set-Cookie | role | success 플래그 |
|------|--------|----------------|-----------|-----------|-------------|------------|------|----------------|
| admin1 | 200 | application/json; charset=utf-8 | 0 | 실패(Unexpected end of JSON input) | 없음 | 없음 | 없음 | 없음 |
| teomok1 | 200 | 위와 동일 | 0 | 동일 | 없음 | 없음 | 없음 | 없음 |
| teomok2 | 200 | 위와 동일 | 0 | 동일 | 없음 | 없음 | 없음 | 없음 |

**해석:** `res.ok === true` 이지만 **응답 본문에 토큰·역할이 없음**이므로, 프론트의 `localStorage`·역할 분기는 **빈 값**으로 동작한다. (다른 시점·클라이언트에서는 본문이 채워질 수 있으나, 위는 해당 실행의 **관측값**이다.)

동일 엔드포인트에 대해 과거/환경에 따라 `401`, `500 proxy_error` 등이 달리 관측될 수 있다.

## 역할 값 (레포 `backend/data/users.json` 기준)

| 계정 | 기대 `role` |
|------|-------------|
| admin1 | `admin` |
| teomok1 | `editor_in_chief` |
| teomok2 | `reporter` |
