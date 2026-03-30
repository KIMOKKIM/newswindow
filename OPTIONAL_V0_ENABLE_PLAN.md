# OPTIONAL_V0_ENABLE_PLAN

Date: 2026-03-30

Purpose: Minimal steps to make v0 preview usable for this mixed repo (optional; do after production fixed).

Minimum requirements to enable v0 preview
1) Add a root package.json that declares how preview should serve the frontend (no build) or points to a static server script.
   - Example minimal package.json:
     {
       "name": "newswindow-root-preview",
       "private": true,
       "scripts": {
         "start": "node scripts/serve-static.js"
       }
     }
2) Ensure scripts/serve-static.js is present and start script serves index.html and static assets from repo root.
3) Optionally add a `vercel.json` with explicit builds/routes for html and api to help preview detection (already present in repo or can be simplified).

Why separate from production
- Preview runs build-detection based on package.json and framework presets; adding a root package.json allows preview to detect a valid start script and serve static files. This does not affect production deployment if vercel.json and production env are configured appropriately.

Risk: adding root package.json must be carefully done to avoid interfering with production build commands; keep it minimal and private.

End of OPTIONAL_V0_ENABLE_PLAN
