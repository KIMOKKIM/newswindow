# PRODUCTION_API_WIRING

Date: 2026-03-30

Objective: Document how production `/api/*` is currently wired and the observed runtime behavior.

1) Current observed responses (production)
- GET https://newswindow.kr/api/health → 502 {"error":"backend_not_configured"} (proxy present, no BACKEND_URL)
- POST https://newswindow.kr/api/auth/login → 404 or 502 (proxy behavior or route not found)

2) api/[...path].js presence
- The repository contains `api/[...path].js` (serverless proxy). This function responds with 502 when BACKEND_URL is not configured.

3) Conclusion: proxy exists and is active in production, and it expects an environment variable BACKEND_URL pointing to the actual backend service. Because BACKEND_URL is not set (or backend is unreachable), proxy returns backend_not_configured and API endpoints are not reachable.

4) What must be set in Vercel
- Environment Variable: BACKEND_URL
- Value: the absolute URL of the backend service that implements the API (e.g., https://backend.newswindow.kr or https://<host>:3000). This value must be reachable by Vercel's serverless functions.

5) Verification after setting
- /api/health → 200 {"ok":true}
- /api/auth/login → 200 or 401 (correct JSON) depending on credentials

