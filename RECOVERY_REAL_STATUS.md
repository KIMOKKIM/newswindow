# RECOVERY_REAL_STATUS

Date: 2026-03-30

1) 실제로 해결된 것
- Static server can be started persistently by the user using `start-local.bat` which launches backend and static server in separate windows.
- Backend health endpoint responds when backend is running (local verification: GET /api/health -> 200).

2) 임시 우회만 된 것
- None remaining: previous dev bypass in auth.js has been removed. (Earlier bypass was temporary; now removed.)
- Note: internal test scripts that used dev bypass were helpful for debugging but are not active for auth anymore.

3) 아직 미해결인 것
- Production site (newswindow.kr) styles.css and script.js return 404 — unresolved. Requires deployment-side investigation (static asset inclusion or routing).
- Login using real authentication still fails for teomok1/teomok2/admin1 because their actual passwords differ from developer guess; auth.js uses bcrypt compare (no bypass). Without correct passwords or reset, real login cannot be completed.
- Intermittent libuv assertion observed during development when starting/stopping node processes; root cause not yet fixed.

4) dev bypass 필요 여부와 위험성
- dev bypass is NOT used now. Leaving a dev bypass in production-code is dangerous (security risk). It was removed.
- If temporary dev bypass is ever reintroduced, it must be gated and removed before any push to origin/master or production deployment.

5) 배포 404의 직접 원인 (현재 확인된 사실)
- index.html references styles.css and script.js at root paths.
- On newswindow.kr those files return 404, indicating either:
  - Static files were not included in the deployed output, or
  - Vercel routing/rewrite is directing requests away from static files (e.g., /api catch-all misconfigured), or
  - Asset paths in HTML do not match deployment output location.
- This must be debugged in deployment logs and Vercel settings; cannot be fixed purely by local changes.

6) 사용자가 실제로 실행해야 할 정확한 명령어
- Start all locally (Windows):
  - Double-click `start-local.bat` in project root OR run in cmd:
    start-local.bat
  - Alternatively:
    cd backend
    npm ci
    npm run start
    (new terminal) node scripts/serve-static.js
  - Then open browser: http://127.0.0.1:5500/

7) 다음 1개 우선조치
- User must set BACKEND_URL in Vercel and trigger redeploy. After redeploy, I will immediately verify newswindow.kr for styles/script 200 and /api proxy responses.

