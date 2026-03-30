# V0_DEFER_NOTE

Note: Defer v0 preview investigation until production static asset serving is verified.

- Rationale: production must serve static files first. If production returns 200 for styles/script, but v0 preview still 404, handle v0 as a separate investigation.
- Do not attempt v0 fixes until production is verified.

