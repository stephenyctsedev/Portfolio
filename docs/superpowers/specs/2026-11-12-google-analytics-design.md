# Google Analytics (GA4) — design

Status: approved by Stephen on 2026-11-12 (short design, small change).

## Intent and why
See what visitors actually open on the XP desktop (resume, portfolio projects, games), not only that the page loaded. The site is a single page, so plain pageviews say little.

## Goals
- GA4 tracking with Measurement ID `G-MB5F6MLB8Q` on the deployed site.
- Custom events for what visitors open and where they leave to.

## Non-goals / anti-goals
- No cookie-consent banner (that was option C; not chosen).
- No personal data and no free-text user input sent to GA (Run-dialog commands are never sent).
- Dev server and tests must not send data to GA.

## Constraints
- Static Vite site on GitHub Pages, base `/Portfolio/`; deployed by `.github/workflows/deploy.yml` on push to `main`.
- Apps all open through `registry.launch(id, payload)` in `src/xp/apps/registry.js`.
- External links open through `openExternal` in `src/xp/createDesktop.js`.

## Approaches
1. Inline gtag snippet in `index.html`: simplest, but fires in dev and scatters `window.gtag` calls.
2. **Chosen (builder's call):** `src/analytics.js` module — loads `gtag.js` in production builds only; exports `track(name, params)` that is a no-op when analytics is off. Testable and keeps dev/test clean.

## Design
- `src/analytics.js`: holds the ID, `initAnalytics()` (production only: injects the gtag script, sets up `dataLayer`), and `track(name, params)`.
- `main.js` calls `initAnalytics()` and passes `track` into `createDesktop` (default no-op, so existing tests are untouched).
- Events:
  - `app_open` `{ app_id, path?, slug? }` — sent from `registry.launch`, only for registered apps. Explorer adds the folder path; the picture viewer adds the project slug.
  - `external_link` `{ host }` — sent from `openExternal` (GitHub repo, mailto).
  - `site_mode` `{ mode: 'room' | 'flat' }` — once on load.
- Tests (vitest): `track` is a no-op outside production; `app_open` fires only for registered ids. Run `npm test` and `npm run build`; confirm the ID appears in `dist/`.
- README: short section on what is tracked and how to change the ID.

## Left to the builder
Exact event-parameter plumbing between `createDesktop`, the registry and the apps; test file layout.

## Verification by Stephen
After deploy, open the live site and check GA4 → Reports → Realtime.
