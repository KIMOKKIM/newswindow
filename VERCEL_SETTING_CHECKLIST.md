# VERCEL_SETTING_CHECKLIST

Checklist of Vercel Project Settings to verify (must be checked in Vercel dashboard)

1) Project Root Directory
- Current actual value: (check in Vercel project Settings > General)
- Expected value for this repo: repository root (empty /)
- Impact if wrong: Vercel will build from a subfolder and static files at repo root will not be included in output.

2) Framework Preset
- Current actual value: (check in Vercel project Settings > Framework Preset)
- Expected: "Other / None" for pure static HTML, or allow vercel.json to control builds
- Impact: Incorrect preset may trigger build processes that move or ignore static files.

3) Build Command
- Current actual value: (check in Project > Deployments > Build & Development Settings)
- Expected: blank (no build) or appropriate command if you use a build step
- Impact: If a build command outputs to a different directory, static root files may be omitted.

4) Output Directory
- Current actual value: (check Output Directory setting)
- Expected: (empty) or "/" (repo root) for static HTML in repo root; or the directory where built static files are placed.
- Impact: If Output Directory points to a subfolder, root static files won't be served.

5) Install Command
- Current actual value: (check Install Command)
- Expected: default (`npm install`) or as needed; not critical for pure static
- Impact: Install command affects serverless function builds; misconfiguration can break API functions.

6) vercel.json application
- Current actual value: verify that vercel.json is present in the repository and that Vercel build logs show it being read.
- Expected: vercel.json should be respected; check build logs for "Using vercel.json" or absence of warnings.
- Impact: If vercel.json is ignored, routes/rewrite definitions will not be applied.

7) Production / Preview environment variable differences
- Current actual values: list of env vars in Production and Preview (check Vercel Project > Environment Variables)
- Expected: BACKEND_URL defined consistently for production; preview may have separate values or be empty.
- Impact: Missing BACKEND_URL in preview will make proxy functions fail; but static files should not depend on BACKEND_URL.

Instructions: Capture screenshots or copy values for each field and attach to audit evidence.

