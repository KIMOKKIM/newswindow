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

