# POST_REDEPLOY_CHECKLIST

Run these checks immediately after changing Vercel Project Root and redeploying.

1) Static assets
- GET https://newswindow.kr/styles.css → expect HTTP 200 and Content-Type text/css
- GET https://newswindow.kr/script.js → expect HTTP 200 and Content-Type application/javascript

2) Page rendering
- Open https://newswindow.kr/ in browser; verify CSS applied and page layout matches local index.html

3) Login page
- Open https://newswindow.kr/nw-office/login.html and confirm it loads (HTML+CSS)

4) API proxy (if applicable)
- POST https://newswindow.kr/api/auth/login with valid credentials → expect 200 or appropriate 401 JSON

5) Build artifacts
- Check Vercel deployment logs for file listing and confirm styles.css/script.js are present in output.

If any step fails, capture network request/response (status, URL), and attach deployment build log snippet.

