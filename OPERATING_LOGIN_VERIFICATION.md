## OPERATING_LOGIN_VERIFICATION

Date: 2026-03-30

This document lists the verification steps to perform after production API is restored (BACKEND_URL set).

1) Login request (production)
- URL: POST https://newswindow.kr/api/auth/login
- Headers: Content-Type: application/json
- Body: { "userid": "<id>", "password": "<password>" }

2) Expected responses
- 200: { accessToken: "...", role: "...", name: "..." } (success)
- 401: { error: "아이디 또는 비밀번호가 올바르지 않습니다." } (invalid creds)
- 5xx/502: backend not configured or unreachable (proxy/BACKEND_URL issue)

3) Test accounts (after BACKEND_URL set)
- teomok1 / teomok$123
- teomok2 / kim$8800811
- admin1 / teomok$123

4) Post-login checks
- Verify accessToken present in response
- Verify role value and redirect behavior of frontend (nw-office pages)
- Verify cookies/localStorage usage per frontend logic

