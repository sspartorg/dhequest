# dhequest.com

Static landing page for DheQuest, served by GitHub Pages (`CNAME` → dhequest.com).

- `index.html` — the whole page: inline CSS and a few lines of vanilla JS, no build step
- `assets/screens/` — app screenshots (WebP, captured at 2x from 1440×900)
- `privacy.html`, `terms.html`, `cookies.html` — legal pages

## Run locally

```
python -m http.server 5500
```

Then open http://localhost:5500.

## Tests

Browser tests live in `tests/` (Playwright, five screen sizes, Chromium and WebKit, plus speed and slow-network budgets).
See `tests/README.md`; in short: `cd tests && npm install && npm run setup && npm test`.
