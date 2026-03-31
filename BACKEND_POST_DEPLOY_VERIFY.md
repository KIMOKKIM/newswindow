#
# BACKEND_POST_DEPLOY_VERIFY
#
Date: 2026-03-30

Post-deploy verification steps once backend is hosted and public URL assigned:

1) Health check
- GET https://<service>.onrender.com/api/health
- Expect: 200 {"ok":true}

2) Login check (production proxy will use this backend via BACKEND_URL)
- POST https://newswindow.kr/api/auth/login
- Body: {"userid":"<id>", "password":"<pw>"}
- Expect: 200 and JSON with accessToken for valid creds

3) Signup / duplicate check
- GET https://newswindow.kr/api/users/check?userid=testuser
- Expect: 200 { available: true/false }

4) Dashboard checks
- Log in and open dashboard pages; confirm UI loads and API calls return 200.

5) Documentation
- Record all responses and capture screenshots of dashboards into `docs/screenshots/`.

