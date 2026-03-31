# API_RECOVERY_DECISION

Date: 2026-03-30

Decision: Path A

Reasoning (evidence-based):
- Production proxy `api/[...path].js` exists and returns {"error":"backend_not_configured"} when invoked — this shows a proxy is deployed and expects BACKEND_URL. (Observed via GET /api/health => 502 backend_not_configured.)
- Therefore an operational backend is expected; setting BACKEND_URL to the operational backend URL will restore API connectivity.

Action to take (single-step):
- Set Vercel environment variable `BACKEND_URL` to the production backend endpoint (e.g., https://api.newswindow.kr or the actual host). Then redeploy.

If setting BACKEND_URL is impossible or there is no backend to point to, then Path B applies (migrate API into serverless functions) — but evidence indicates Path A is correct.

