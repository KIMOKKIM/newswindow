# V0_VERCEL_DIFF_REPORT

Date: 2026-03-30

Goal: Compare how v0 preview likely interprets this repo vs production Vercel, and identify differences that could produce 404 in v0 preview.

1) v0 preview observed symptom
- v0 preview returns 404 Not Found for requested preview URL(s) (user reported). Meanwhile production `newswindow.kr` auto-deploys but static asset 404s observed.

2) Differences likely between v0 and production behavior
- Build detection:
  - Vercel auto-detects frameworks; v0 preview may run default static builder or platform-specific detection that differs from production settings (e.g., legacy vs current vercel runtime).
  - If vercel.json or explicit `builds` exists, production honors it; some preview systems may ignore or mis-evaluate if Root Directory setting differs.
- Root directory / outputDirectory:
  - If project is deployed with a non-root Root Directory in Vercel project settings (e.g., user set a subfolder earlier), v0 preview may use different root than production.
- Functions/Serverless differences:
  - Production runs built serverless functions per vercel.json; v0 preview might not build node functions if build detection fails — resulting in /api preview 404.
- Static assets:
  - Production may include static files, but if v0 preview uses different output or build step (e.g., expects `public/`), assets can be missing resulting in 404.

3) Evidence from repo
- vercel.json exists in repo:
  - builds: { "src": "api/**/*.js", "use": "@vercel/node" }, { "src":"**/*.html","use":"@vercel/static" }
  - routes: /api/(.*) -> /api/[...path].js, fallback / -> static
- index.html references `styles.css` and `script.js` at root.
- api/[...path].js is a proxy; it requires BACKEND_URL environment variable in deployment to function.

4) Likely v0 vs production mismatch scenarios
- Scenario A (Root Directory mismatch): v0 preview uses a different root (e.g., `/backend`), so index.html or static files are not served, causing 404.
- Scenario B (Build detection mismatch): v0 preview did not recognize vercel.json or ignored builds — API routes not created, static not served as expected.
- Scenario C (Preview environment missing BACKEND_URL): v0 preview causes API 404s (proxy returns 502 or not found).

5) Recommended checks (to run on Vercel console)
- Confirm Project Root setting in Vercel dashboard for the repository.
- Confirm that vercel.json is respected in preview builds (check build logs).
- Confirm that static files are in the deployment output (list files in preview build artifact).
- Confirm that Functions tab lists api/[...path].js in preview.

End of V0_VERCEL_DIFF_REPORT

