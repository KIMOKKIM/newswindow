# BACKEND_DEPLOYMENT_OPTIONS

Date: 2026-03-30

Goal: Evaluate minimal ways to publish the existing Express backend (backend/server.js) as a publicly reachable service so production BACKEND_URL can be set.

Repo facts:
- backend entry: `backend/server.js`
- backend uses process.env.PORT || 3000 and serves `/api/*`.
- backend stores users in `backend/data/users.json` (file-based).

Options (brief)
- Render (recommended): Create a new Web Service pointing at the `backend/` directory; Build command: `npm ci`; Start command: `npm start` (or `node server.js`). Provides a public HTTPS URL like `https://<service>.onrender.com`. Persistent storage: `backend/data/users.json` will be part of the service filesystem (non-persistent across redeploys unless you use managed DB or disk).
- Railway: Similar to Render; quick for Node apps from a subfolder. Provides `https://<project>.up.railway.app`.
- Vercel (separate project): Can host Node server either as serverless functions (requires refactor) or as an App (Vercel's Node serverless). Requires adapting Express to serverless or use `start` script with Vercel's Serverless Container (more involved).
- VPS (bare metal / droplet): Use `pm2` or systemd; gives full control but more operational overhead.

Minimal-change recommendation: Render or Railway — they accept a Node service from a subfolder with minimal config changes and expose an HTTPS public URL without refactoring.

