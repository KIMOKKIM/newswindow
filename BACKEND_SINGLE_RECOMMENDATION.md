# BACKEND_SINGLE_RECOMMENDATION

Date: 2026-03-30

Recommendation (single)
- Host the backend as a separate Web Service on Render (https://render.com).

Why Render (concise, evidence-based)
- Supports deploying a Node/Express app directly from a subfolder (backend/) without refactoring to serverless.
- Minimal required changes (no code rewrite).
- Provides a stable public HTTPS URL (e.g., https://<service>.onrender.com) suitable to set as BACKEND_URL in Vercel.
- Good developer UX for quick recovery and rollback.

Expected public URL format after deployment
- https://<service-name>.onrender.com
- Example format to set in Vercel: `https://your-backend-service.onrender.com`

Deployment success verification sequence (after Render deploy)
- GET https://<service>.onrender.com/api/health → expect 200 {"ok":true}
- POST https://newswindow.kr/api/auth/login → expect proxy to forward to backend and return 200/401 depending on creds

Minimal changes required in repo
- None required to backend code; ensure `backend/package.json` has `"start": "node server.js"` (it does).
- Ensure backend/data/users.json is included in the deployment package (it is under backend/).
- If persistent storage required across redeploys, consider using a proper DB; for quick recovery file-based users.json is acceptable.

