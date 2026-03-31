# BACKEND_URL_FINAL_CONNECTION_STEPS

Date: 2026-03-30

After you deploy the backend (recommended: Render), set Vercel BACKEND_URL as follows:

- Key: BACKEND_URL
- Value format: https://<your-backend-service>.onrender.com

Exact steps:
1) Deploy backend on Render (Root Directory = backend, Start = npm start). Note the service URL shown by Render (e.g., https://your-backend.onrender.com).
2) In Vercel Project > Settings > Environment Variables, add:
   - Key: BACKEND_URL
   - Value: https://your-backend.onrender.com
   - Environment: Production (and Preview if desired)
3) Trigger a redeploy of the Vercel project.

Post-deploy verification:
- GET https://newswindow.kr/api/health → should return 200 {"ok":true}
- POST https://newswindow.kr/api/auth/login → should proxy to backend and return 200/401 JSON

