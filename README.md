# Komitee Equal Shares

A lightweight, static web app to view and explore allocations computed with the Method of Equal Shares (MES), customized for Kultur Komitee Winterthur 2025 (KK25).

- Live: serve `index.html` locally or deploy to GitHub Pages.
- Data: ships with sanitized `data/kk25.pb` (unselected projects named "-"). No runtime CSV dependencies.

## Quick start

- Option A: open `index.html` directly in your browser.
- Option B (recommended): serve the folder to enable workers and avoid caching issues.

```sh
# from this folder
npm install
npm run start
# then open http://localhost:5173
```

Drag-and-drop a `.pb` file to compute and render results. By default, the app auto-loads `data/kk25.pb`.

## Features

- MES results table with sortable columns and inline bar charts
- Group vs. Individual funding split
- Detailed receipts view (shows real name or 3‑digit ID for anonymized entries)
- Internationalization (EN/DE) and an explainer (“How to read this table”)

## Deploy (GitHub Pages)

1) Push this folder to GitHub (main branch).
2) In the repo settings, enable GitHub Pages for the main branch and the root directory.
3) Ensure web worker and library paths remain relative (they are).

## Privacy

Only include sanitized `.pb` files for public deployments. This repo ships only `data/kk25.pb`. The UI does not load any selection CSVs and relies on pre-sanitized names.

## License

MIT — see `LICENSE`. Third-party licenses in `NOTICE` and `js/libraries/*/*.license.txt`.
