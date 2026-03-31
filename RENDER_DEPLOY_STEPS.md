# RENDER_DEPLOY_STEPS

Date: 2026-03-30

Step-by-step: Deploy backend/ to Render as a Web Service (minimal changes)

1) Create new Web Service on Render
- Service type: Web Service
- Root Directory: `backend`
- Environment: Node

2) Build & Start commands
- Build Command: `npm ci`
- Start Command: `npm start`  (backend/package.json must include `"start": "node server.js"`)

3) Environment variables (Render service settings)
- Add `NODE_ENV=production`
- Add `JWT_SECRET` (production secret) — you must provide a secure secret.
- (Optional) Add `CORS_ORIGIN=https://newswindow.kr` if CORS is restricted.

4) Deploy
- Trigger deploy via Render UI (connect to GitHub repo and point to branch master).
- Render will provide a public HTTPS URL such as `https://<service>.onrender.com`.

5) After deploy, capture the public URL and use it as Vercel BACKEND_URL (see BACKEND_URL_FINAL_CONNECTION_STEPS.md).

