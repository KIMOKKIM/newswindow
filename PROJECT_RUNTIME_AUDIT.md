# PROJECT_RUNTIME_AUDIT

Date: 2026-03-30

Summary: audit of runtime model for this repository.

1) Project type (conclusion)
- Frontend: Plain static HTML/CSS/JS. Entry: `index.html` at repository root. No SPA bundler (no Next/Vite/React build scripts present).
- Backend: Node/Express application located in `backend/` (entry: `backend/server.js`), serving `/api/*` endpoints.
- Repo layout: Frontend static files and backend coexist in single repository (mixed static + server).
  - Static resources live at project root (styles.css, script.js, nw-office/...), not in a separate `public/` folder.
  - Backend has its own package.json, package-lock.json, node_modules.

2) How it runs locally
- Backend: `cd backend && npm run start` (or `node backend/server.js`) -> listens on PORT (3000 default).
- Frontend: must be served by a static server (e.g., `npx serve . -l 5500`) or using the provided `scripts/serve-static.js` to serve root at port 5500.
- No single monorepo build script that bundles both frontend and backend for Vercel automatic full-stack detection.

3) Vercel considerations
- To deploy static frontend + serverless API on Vercel from one repo, project must expose serverless functions under `api/` and set `vercel.json` builds/routes accordingly.
- This repo has an `api/[...path].js` proxy and `vercel.json` (was restored), which implement a proxy pattern: route /api/* -> serverless function that forwards to BACKEND_URL.
- Alternative: run backend as serverless functions directly (requires converting Express handlers to Vercel functions).

4) Key runtime constraints
- Static files are referenced with root-relative paths (e.g., `/styles.css`, `./styles.css` depending on file). Vercel serves static files from repo root unless rewrites/routes interfere.
- Because frontend is static and backend is separate, deployment must ensure static files are included in output and not intercepted by API routes.

End of PROJECT_RUNTIME_AUDIT

