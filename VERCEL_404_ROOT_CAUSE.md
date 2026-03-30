# VERCEL_404_ROOT_CAUSE

Date: 2026-03-30

Executive summary (direct root cause hypothesis)
- The immediate cause of 404s for static assets and API in preview is a mismatch between how the preview environment interprets the repository layout and the repo's vercel.json/build configuration. In particular:
  - Static HTML is deployed, but static asset paths (styles.css, script.js) return 404 — this implies either those files were not included in the preview artifact or rewrites/routes intercept them.
  - api/[...path].js exists as a serverless proxy, but it requires BACKEND_URL to be set; if not present in preview, some API requests will 404 or proxy to nowhere.

Direct evidence
- newswindow.kr/styles.css -> 404 (checked)
- vercel.json present in repository with builds for api/**/*.js and **/*.html and route mapping /api/(.*) -> api/[...path].js
- index.html references root-level styles and script files (relative paths).

Most likely single direct cause
- Output Directory / Build detection mismatch in preview: preview build did not produce or expose static files at the expected root path (or vercel routing configuration in preview differs), resulting in 404 for static assets.

Minimum actionable fix (no env changes)
- Ensure vercel.json is committed (it is) and confirm Vercel project Root Directory is set to repository root (default). If Root Directory is different in preview settings, set to root.
- If preview logs show vercel.json ignored, adjust Project Settings to disable "Framework Preset" automatic detection so vercel.json is respected.

Follow-up diagnostic tasks (if immediate fix fails)
- Inspect preview build logs: look for files listing (styles.css/script.js) in artifact.
- Inspect preview Functions tab: confirm api/[...path].js deployed.
- Check route precedence in vercel.json (static files should be served; ensure no catch-all rewrites hide static)

End of VERCEL_404_ROOT_CAUSE
