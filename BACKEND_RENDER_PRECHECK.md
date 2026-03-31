# BACKEND_RENDER_PRECHECK

Date: 2026-03-30

Pre-deploy checklist for deploying `backend/` to Render (or equivalent).

1) Confirm start script
- File: backend/package.json
- Required: `"start": "node server.js"`
- Action: Ensure property exists. (This repo already has start script.)

2) Confirm PORT handling
- File: backend/server.js
- Required: `const PORT = process.env.PORT || 3000;` and `app.listen(PORT, ...)`
- Action: Confirm present. Render supplies PORT via env at runtime.

3) Health endpoint
- URL: GET /api/health
- Action: Confirm endpoint exists and returns `{"ok": true}` when backend runs locally.

4) Data file path
- File: backend/db/db.js (or code that reads users file)
- Requirement: Use relative path from `process.cwd()` or a path resolved inside `backend/` so that `backend/data/users.json` is available after deploy.
- Action: Confirm code reads `path.join(process.cwd(), 'data')` or equivalent and that `backend/data/users.json` is included in repo.

5) CORS
- File: backend/server.js
- Action: Confirm CORS allows production origin (newswindow.kr). If not, plan to set `CORS_ORIGIN` env var in Render or add newswindow.kr to allowed origins.

6) Environment variables required (minimum)
- JWT_SECRET (production secret)
- CORS_ORIGIN (optional; allow newswindow.kr)
- Any other app-specific envs (check backend/.env.example)

7) Persistent storage note
- `backend/data/users.json` is file-based storage. On many hosts this file is part of the deployment image and changes do not persist across deploys. For production persistence consider using a DB. For quick recovery, file-based is acceptable but be aware of persistence limitations.

