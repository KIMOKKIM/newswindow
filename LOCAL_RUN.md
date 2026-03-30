# Local Run Instructions

This file documents the exact commands to run the project locally (backend-first).

Prerequisites
- Node.js (LTS)

1) Start backend
 - Open terminal at project root
 - Run:
   cd backend
   npm ci
   npm run start
 - Backend listens at: http://127.0.0.1:3000

2) Start static server (serves frontend on port 5500)
 - Option A (recommended for Windows): double-click `start-local.bat` in project root. This opens two windows (Backend, Static).
 - Option B (manual):
   - In one terminal (project root): node scripts/serve-static.js
   - Or use: npx serve . -l 5500
 - Frontend URL: http://127.0.0.1:5500

3) Browse
 - Main page: http://127.0.0.1:5500/
 - Staff login: http://127.0.0.1:5500/nw-office/login.html

4) Stop and restart
 - Close the cmd windows started by start-local.bat or terminate the node processes.
 - Restart by rerunning start-local.bat.

Notes
- Do NOT modify `.env` or production secrets.
- For login testing, ensure backend is running before submitting forms.

