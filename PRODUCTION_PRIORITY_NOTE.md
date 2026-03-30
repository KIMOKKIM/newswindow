# PRODUCTION_PRIORITY_NOTE

Date: 2026-03-30

Purpose: summarize which production issues must be fixed first and why v0 preview is lower priority.

1) Production issues to prioritize (in order)
- 1) Static asset 404: `styles.css` and `script.js` return 404 on https://newswindow.kr — this prevents the site from rendering correctly and must be fixed before anything else.  
- 2) Operating login failures: ensure /api/auth/login proxies to a working backend and authenticates using stored bcrypt hashes. Production login is critical for staff operations.  
- 3) Local developer experience (static server) — useful, but lower priority for production outage.

2) Why v0 preview is not the priority
- v0 preview currently cannot analyze this repo (No package.json Found). Fixing preview does not fix production; production is the live customer-facing system and must be restored first.

3) Actions to take now (production-first)
- Verify production build output (deployment logs) and ensure static files are present in artifact; verify Vercel routing does not intercept static file requests incorrectly.
- After static assets are serving, verify /api proxy and login flows.

End of PRODUCTION_PRIORITY_NOTE
