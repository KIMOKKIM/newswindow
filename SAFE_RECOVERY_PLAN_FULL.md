# SAFE_RECOVERY_PLAN_FULL

Date: 2026-03-30 (detailed plan)

Purpose: Provide a step-by-step, minimal-risk recovery plan that addresses the three concurrent problems after restoring to 2026-03-25 commit: local static server failure, deployed static assets missing, and staff login failure.

PRINCIPLES (must follow)
- No .env or secret modification.
- Do one small, reversible change at a time.
- Always create a backup branch before any change (already: `backup-before-restore-290be87`).
- Collect logs and evidence before making changes.

PHASE 0 — Preconditions (READ-ONLY)
1. Ensure you have a copy of deployment logs & screenshots (Vercel).
2. Ensure backup branch exists (done).
3. Do not change code until Phase 1 approval.

PHASE 1 — Local static server & login path check (priority: highest local reproducibility)
Objective: Make local site viewable and login functional without touching production.
Steps (safe, reversible):
 A. Start backend:
    - cd backend
    - npm ci
    - npm run start
    - Verify: curl http://127.0.0.1:3000/api/health → should return {"ok":true}
 B. Start static server for frontend (project root):
    - Option 1 (recommended): npx serve . -l 5500
    - Option 2: use editor Live Server extension
    - Verify: open http://127.0.0.1:5500 and confirm index.html loads.
 C. Verify login page network:
    - Open http://127.0.0.1:5500/nw-office/login.html
    - Inspect network: note the API endpoint used. If login.html still points to http://127.0.0.1:3001, do NOT change yet — document it.
 Deliverable: local pages load and backend health OK. If login fails due to API port mismatch, propose a single-line change (login.html API -> 127.0.0.1:3000) to be applied only after user approval.

PHASE 2 — Deployment static assets & API proxy (priority: production recovery)
Objective: Ensure deployed site serves static assets and proxies /api to backend.
Steps (safe):
 A. Verify vercel.json and api/[...path].js exist in repo (they are present).
 B. In Vercel console:
    - Set environment variable: BACKEND_URL = https://<your-backend-host> (or staging)
    - Trigger redeploy.
 C. After redeploy, verify:
    - https://newswindow.kr/styles.css → 200 (not 404)
    - https://newswindow.kr/script.js → 200
    - POST https://newswindow.kr/api/auth/login -> should proxy to backend and return 200 or 401 with proper JSON.
 If the static assets remain 404 after redeploy:
    - Inspect deployment build logs: ensure static files included and not ignored by vercel.json or build step.
    - If vercel routes are overriding static paths, adjust vercel.json routes ordering: ensure static files are served (routes should include /api first, then fallback to static).
Deliverable: Deployed site renders with CSS/JS and /api endpoints are proxied.

PHASE 3 — Minimal code fixes for login if needed (apply ONLY if evidence supports)
Objective: If local login fails because login.html uses wrong port, apply minimal fix.
Steps:
 1. Change a single line in `nw-office/login.html`:
    - from: `const API = 'http://127.0.0.1:3001';`
    - to: `const API = (function(){ try { const host = location.hostname||''; return /^(localhost|127\\.0\\.0\\.1)$/.test(host) ? 'http://127.0.0.1:3000' : '/api'; }catch(e){return '/api';} })();`
 2. Commit as `fix(login): use local backend 3000 / relative /api for production`.
 3. Test local login and production after redeploy/proxy.
Rationale: This is a single-line (or small block) defensive change ensuring local developer uses backend:3000 while production uses /api.

PHASE 4 — libuv assertion (Windows) mitigation (apply only if reproducible)
Objective: Reduce chance of native assertion by avoiding overlapping Node processes and ensuring clean shutdown.
Steps (low-risk):
 1. Avoid running multiple node instances simultaneously in the same workspace.
 2. When using dev-proxy or test scripts, ensure they are started/stopped cleanly (use process managers or `npm run dev` scripts).
 3. If assertion persists and reproducible, capture full stdout/stderr and consider upgrading Node to latest LTS after staging tests.
Note: Upgrading Node has risk; test in staging first.

ROLLBACK / SAFETY
- Before any file change, create a branch `backup-before-change-<timestamp>`.
- If change causes regression, revert with `git reset --hard backup-before-change-...` and, if needed, `git push --force`.
- Do not modify .env or secrets; do not force-reset remote without owner approval.

VALIDATION CHECKLIST (post-change)
- [ ] Frontend on localhost:5500 loads with styles and script.
- [ ] Backend health: GET /api/health returns 200.
- [ ] Local login: POST to local API returns 200 (or proper 401 JSON).
- [ ] Production: /styles.css and /script.js return 200.
- [ ] Production: POST /api/auth/login proxies and returns expected JSON.
- [ ] No native Node assertions appear during normal start/stop cycles.

APPROVAL
- After you confirm, I will perform the approved minimal change(s) in sequence (Phase 1 local server actions are user-run; code changes in Phase 3 require explicit approval).

End of SAFE_RECOVERY_PLAN_FULL
