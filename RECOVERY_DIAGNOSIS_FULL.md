# RECOVERY_DIAGNOSIS_FULL

Date: 2026-03-30 (detailed)

Purpose: Investigate why, after restoring to commit 2026-03-25 12:35 (617f94e), three issues occur simultaneously:
1) Local static server (127.0.0.1:5500) connection refused  
2) Deployed site (newswindow.kr) displays unstyled/plain HTML (CSS/JS missing)  
3) Staff accounts cannot log in (teomok1, teomok2, admin1)

---

SECTION A — Git / Files / Project snapshot
- Current branch: master  
- Current HEAD: 617f94e (feat: 메인 기사 상세 페이지 및 공개 API 연동)  
- Recent commits (top 10): 617f94e, 8a5a0ca, 1763f3d, d934123, 7b42af7, f92abd8, 79f3894, 6dbb0f3, 05c3b6a, 1f98e9d  
- Working tree: cleaned; earlier debugging artifacts (root package.json, root node_modules) were removed and backend deps reinstalled.  
- Important files present: index.html, styles.css, script.js, nw-office/login.html, backend/server.js, backend/routes/auth.js, backend/data/users.json, api/[...path].js (restored), vercel.json (restored).

SECTION B — Project type & run model
- Frontend: static site (plain HTML/CSS/JS); root index.html is the entry. No bundler (Vite/Next) detected in repo.
- Backend: Express app at backend/server.js serving /api/* (port 3000 by default).
- Local run:
  - Backend: `cd backend && npm run start` (or `node backend/server.js`) -> listens on port 3000
  - Frontend: must be served by a static server (Live Server or `npx serve . -l 5500`) — there is no built-in script to run 127.0.0.1:5500 automatically.

SECTION C — Collected errors / network evidence
- Deployed site checks:
  - GET https://newswindow.kr/ → 200 HTML returned
  - GET https://newswindow.kr/styles.css → 404 Not Found
  - GET https://newswindow.kr/script.js → 404 Not Found
  => Deployed HTML exists, but static assets return 404 — explains "unstyled plain HTML" symptom.

- Local checks:
  - http://127.0.0.1:5500 → ERR_CONNECTION_REFUSED (no static server listening on 5500)
  - backend health (after starting backend): http://127.0.0.1:3000/api/health → {"ok":true, "timestamp":...}

- Login checks:
  - `nw-office/login.html` content in HEAD shows `const API = 'http://127.0.0.1:3001';` — backend runs on 3000, so local login form sends to wrong port -> connection failure.
  - When /api is not proxied in deployment (or BACKEND_URL not set), POST to /api/auth/login returns 404.
  - backend/data/users.json contains teomok1, teomok2, admin1 records with password_hash fields (accounts exist).

- Other logs:
  - Earlier intermittent Node native assertion ("!(handle->flags & UV_HANDLE_CLOSING) at src/win/async.c") seen during ad-hoc tests — likely from overlapping Node processes or dev proxy misuse; not reproduced when backend started alone.

SECTION D — Root-cause candidates (Top)
1. Missing static assets on deployment or incorrect routing of static files → styles.css & script.js 404 (primary cause of unstyled page).  
2. Frontend login page uses wrong local API port (3001 vs 3000) → local login requests fail.  
3. Local static server (5500) not running → ERR_CONNECTION_REFUSED.  
4. Deployment not configured to forward /api to backend (BACKEND_URL not set or serverless proxy missing) → /api calls 404.  
5. Residual dev/debug artifacts or node processes causing intermittent native assertion (secondary, development-only).

SECTION E — Evidence summary (quick bullets)
- index.html references `styles.css` and `script.js` at root relative paths — if static files not deployed or served, they 404.
- nw-office/login.html (HEAD) uses `http://127.0.0.1:3001` — mismatch with backend port 3000.
- backend/user DB file contains staff accounts (no evidence of DB corruption).
- api/[...path].js and vercel.json were restored to repo, but deployment must set `BACKEND_URL` and redeploy for proxy to work.

SECTION F — Minimal immediate conclusions
- For local issues: start a static server on 5500 and ensure backend runs on 3000. Then either change login.html API port to 3000 (single-line change) or run a local proxy.  
- For deployment: set BACKEND_URL in Vercel and redeploy; verify styles and scripts are included in the deployment build (if they are in repo, likely redeploy will include them; if not, investigate vercel.json/build settings).  
- For login: after deployment proxy exists, /api/auth/login should reach backend and authenticate (assuming backend has correct user records). If still failing, capture network request/responses.

End of RECOVERY_DIAGNOSIS_FULL
