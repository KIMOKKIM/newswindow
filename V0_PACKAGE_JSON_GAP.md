# V0_PACKAGE_JSON_GAP

Date: 2026-03-30

1) "No package.json Found" 의미
- The v0 preview system expects a Node/JS project (package.json present) to detect framework or to run builds. The message indicates v0 did not find a package.json at the project root of the preview it attempted to run.
- When package.json is absent, v0's preview builder may not perform the same static-file deployment path as production, and may treat the repo as unsupported or return 404 for previews that expect a Node app entry.

2) Why this repo is not compatible with v0 preview as-is
- Repo is a mixed static + Express backend:
  - Frontend: static HTML/CSS/JS at repo root (index.html, styles.css, script.js).
  - Backend: Express app at `backend/server.js` with its own package.json under `backend/`.
- v0 preview expects package.json in project root (or configured root) to detect build commands and framework preset; having only backend/package.json causes v0 to report "No package.json Found" when preview runs from repo root.

3) Why v0 issue is distinct from production static 404
- Production 404 for styles/script is a runtime artifact omission in production build output or routing; production did deploy HTML but static assets were 404. That demonstrates production did produce an artifact but omitted or failed to serve certain files.
- v0 "No package.json Found" is a preview detection failure at build-time (preview can't even determine how to build/run the repo). It is an orthogonal problem: production may still deploy via Vercel's full build detection or prior settings, while preview's simplified detection fails.

4) Practical consequence
- v0 preview cannot be used for reliable testing on this repo until either (a) a root package.json is present that instructs the preview how to serve static content, or (b) preview settings are adjusted to point to a subfolder with a package.json. Meanwhile, production must be fixed separately.

End of V0_PACKAGE_JSON_GAP
