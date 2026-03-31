# BACKEND_PREDEPLOY_CHECKLIST

Date: 2026-03-30

Minimal pre-deploy checks and small changes to make backend ready for Render (or similar).

1) Ensure start script
- File: backend/package.json
- Required: "start": "node server.js"
- Check: already present. No change required.

2) Ensure PORT handling
- File: backend/server.js
- Required: uses process.env.PORT || 3000 (already implemented).

3) Ensure data file path
- File: backend/db/db.js or backend code that reads backend/data/users.json
- Required: uses relative path under backend (process.cwd() used) — deploy from backend/ so data path is correct.

4) CORS
- backend already sets CORS origins; ensure production origin (newswindow.kr) allowed if necessary via env CORS_ORIGIN.

5) Health endpoint
- GET /api/health present (returns ok).

6) Build & start commands for Render
- In Render: Root Directory: backend
- Build Command: npm ci
- Start Command: npm start

