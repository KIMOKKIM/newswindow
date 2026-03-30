# ROOT_DIRECTORY_EXPLANATION

Why Project Root Directory matters (concise)

- In this repository the static files `index.html`, `styles.css`, and `script.js` sit at the repository root. Vercel (production) and preview systems build and publish files relative to a configured Root Directory and Output Directory.

- If Vercel's Project Root Directory is set to a subfolder (for example `backend/`), Vercel's build step will treat that subfolder as the repository root. In that case:
  - files at the actual repository root (index.html, styles.css, script.js) are outside the build context and not included in the deployment artifact.
  - Deploy will still succeed if a file `index.html` exists within the selected root, but root-level assets will not be present — causing production HTML to load (if it exists) while root static assets return 404.

- Therefore, for this repo, Project Root Directory must be the repository root (empty) so that vercel.json, index.html, styles.css, script.js are included in the deployment output and served at https://<project>/*.

Example:
- Repo layout:
  - /index.html
  - /styles.css
  - /script.js
  - /backend/...
- If Project Root = `backend/` → Vercel will deploy files relative to backend and will NOT include /styles.css => requests to /styles.css return 404.

