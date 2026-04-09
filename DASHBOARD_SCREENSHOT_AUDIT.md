> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# DASHBOARD_SCREENSHOT_AUDIT

Date: 2026-03-30

After production API restoration, capture per-account dashboard screenshots and record URLs:

- admin1: /nw-office/admin.html (capture screenshot after login)
- teomok1: /nw-office/editor.html or reporter.html based on role (capture)
- teomok2: /nw-office/reporter.html (capture)

Store screenshots in project folder `docs/screenshots/` with filenames:
 - admin1_dashboard.png
 - teomok1_dashboard.png
 - teomok2_dashboard.png

Also record main API calls status used by dashboards and confirm 200 responses.

